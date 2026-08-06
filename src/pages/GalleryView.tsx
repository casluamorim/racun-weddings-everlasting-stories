import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { toast } from "sonner";
import { signedUrls, protectedSignedUrls } from "@/lib/galleryStorage";
import { GalleryRender } from "@/components/gallery/GalleryRender";
import { mergeDesign } from "@/lib/galleryDesign";

const SESSION_KEY = "racun-gallery-session";
const accessKey = (slug: string) => `racun-gallery-access-${slug}`;

function getSessionId(): string {
  let s = localStorage.getItem(SESSION_KEY);
  if (!s) { s = crypto.randomUUID().replace(/-/g, ""); localStorage.setItem(SESSION_KEY, s); }
  return s;
}

const GalleryView = () => {
  const { slug } = useParams<{ slug: string }>();
  const sessionId = useMemo(getSessionId, []);

  const [accessToken, setAccessToken] = useState<string>(() =>
    slug ? sessionStorage.getItem(accessKey(slug)) ?? "" : ""
  );
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(false);

  const { data: gallery, isLoading, error, refetch: refetchGallery } = useQuery({
    queryKey: ["gallery", slug, accessToken],
    enabled: !!slug,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_gallery_by_token", { _slug: slug!, _token: accessToken });
      if (error) throw error;
      if (!data || data.length === 0) {
        // Either it does not exist, or it is locked behind a password
        const { data: locked } = await supabase.rpc("gallery_requires_password", { _slug: slug! });
        if (locked === true) throw new Error("password_required");
        throw new Error("not_found");
      }
      return data[0];
    },
  });

  const needsPassword = (error as Error | null)?.message === "password_required";

  const { data: files } = useQuery({
    queryKey: ["gallery-files", gallery?.id, accessToken],
    enabled: !!gallery?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_gallery_files_by_token", { _slug: slug!, _token: accessToken });
      if (error) throw error;
      return data ?? [];
    },
  });

  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!files?.length || !gallery) return;
    const all = files.flatMap((f: any) => [f.thumb_path, f.web_path, f.original_path].filter(Boolean) as string[]);
    const loader = gallery.is_password_protected
      ? protectedSignedUrls(gallery.slug, accessToken, all, 7200)
      : signedUrls(all, 7200);
    loader.then(setUrls).catch(() => {});
  }, [files, gallery, accessToken]);

  const { data: favorites, refetch: refetchFavs } = useQuery({
    queryKey: ["gallery-favs", gallery?.id, sessionId, accessToken],
    enabled: !!gallery?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_gallery_favorites", {
        _slug: slug!, _session_id: sessionId, _token: accessToken,
      });
      if (error) throw error;
      return new Set((data ?? []).map((d: any) => d.file_id));
    },
  });

  useEffect(() => {
    if (gallery?.id) supabase.rpc("increment_gallery_view", { _gallery_id: gallery.id });
  }, [gallery?.id]);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !password || lockSeconds > 0) return;
    setChecking(true);
    try {
      const { data, error } = await supabase.rpc("verify_gallery_password", { _slug: slug, _password: password });
      if (error) {
        const m = /locked_out:(\d+)/.exec(error.message ?? "");
        if (m) {
          setLockSeconds(parseInt(m[1], 10));
          toast.error("Muitas tentativas. Aguarde alguns minutos.");
        } else {
          toast.error("Não foi possível verificar a senha.");
        }
        return;
      }
      if (!data) {
        toast.error("Senha incorreta.");
        return;
      }
      sessionStorage.setItem(accessKey(slug), data as string);
      setAccessToken(data as string);
      setPassword("");
      refetchGallery();
    } finally {
      setChecking(false);
    }
  };

  const toggleFav = async (fileId: string) => {
    if (!gallery) return;
    if (favorites?.has(fileId)) {
      await supabase.rpc("remove_gallery_favorite", { _file_id: fileId, _session_id: sessionId, _token: accessToken });
    } else {
      await supabase.rpc("add_gallery_favorite", { _file_id: fileId, _session_id: sessionId, _token: accessToken });
    }
    refetchFavs();
  };

  const downloadOne = async (f: any) => {
    const path = f.original_path || f.web_path;
    const url = urls[path];
    if (!url) return;
    const a = document.createElement("a");
    a.href = url; a.download = f.file_name; a.target = "_blank"; a.click();
  };

  const downloadAll = async () => {
    if (!gallery) return;
    toast.loading("Preparando ZIP...", { id: "zip" });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gallery-download-zip?slug=${gallery.slug}&access=${encodeURIComponent(accessToken)}`,
        { headers: session ? { Authorization: `Bearer ${session.access_token}` } : {} }
      );
      if (!res.ok) throw new Error("Falha");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = `${gallery.slug}.zip`; a.click();
      toast.success("Download iniciado!", { id: "zip" });
    } catch { toast.error("Erro ao gerar ZIP", { id: "zip" }); }
  };

  const share = async () => {
    const url = `https://weddings.agenciaracun.com/galeria/${slug}`;
    if (navigator.share) { try { await navigator.share({ title: gallery?.couple_names, url }); } catch {} }
    else { navigator.clipboard.writeText(url); toast.success("Link copiado!"); }
  };

  if (isLoading) return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <Skeleton className="h-[60vh] w-full" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)}</div>
    </div>
  );

  if (needsPassword) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <Helmet>
        <title>Galeria privada — Racun Weddings</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <form onSubmit={submitPassword} className="w-full max-w-sm space-y-4 text-center">
        <Lock className="h-8 w-8 mx-auto text-primary" />
        <h1 className="font-heading text-2xl">Galeria protegida</h1>
        <p className="text-sm text-muted-foreground">Digite a senha enviada pelo casal para ver as fotos.</p>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          autoComplete="current-password"
          maxLength={128}
        />
        <Button type="submit" className="w-full" disabled={checking || password.length === 0}>
          {checking ? "Verificando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );

  if (error || !gallery) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <h1 className="font-heading text-3xl mb-2">Galeria não encontrada</h1>
      <p className="text-muted-foreground mb-6">Verifique o link recebido.</p>
      <Link to="/" className="text-primary underline">Voltar ao site</Link>
    </div>
  );

  const design = mergeDesign((gallery as any).design_settings);
  const heroUrl = gallery.cover_url ?? (files?.[0] && urls[(files[0] as any).web_path]);
  const ctaUrl = `https://wa.me/5547997096098?text=${encodeURIComponent(`Olá! Vim da galeria de ${gallery.couple_names}.`)}`;

  return (
    <>
      <Helmet>
        <title>{gallery.couple_names} — Racun Weddings</title>
        <meta name="description" content={gallery.description ?? `Galeria privada de ${gallery.couple_names}`} />
        <meta name="robots" content="noindex,nofollow" />
        <meta property="og:title" content={gallery.couple_names} />
        {heroUrl && !gallery.is_password_protected && <meta property="og:image" content={heroUrl} />}
      </Helmet>
      <GalleryRender
        gallery={gallery as any}
        files={(files ?? []) as any}
        urls={urls}
        design={design}
        favorites={favorites}
        onToggleFav={toggleFav}
        onDownloadOne={downloadOne}
        onDownloadAll={downloadAll}
        onShare={share}
        ctaWhatsappUrl={ctaUrl}
      />
    </>
  );
};

export default GalleryView;
