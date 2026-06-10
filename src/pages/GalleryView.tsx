import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { signedUrls } from "@/lib/galleryStorage";
import { GalleryRender } from "@/components/gallery/GalleryRender";
import { mergeDesign } from "@/lib/galleryDesign";

const SESSION_KEY = "racun-gallery-session";

function getSessionId(): string {
  let s = localStorage.getItem(SESSION_KEY);
  if (!s) { s = crypto.randomUUID().replace(/-/g, ""); localStorage.setItem(SESSION_KEY, s); }
  return s;
}

const GalleryView = () => {
  const { slug } = useParams<{ slug: string }>();
  const sessionId = useMemo(getSessionId, []);

  const { data: gallery, isLoading, error } = useQuery({
    queryKey: ["gallery", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_gallery_by_token", { _slug: slug!, _token: "" });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("not_found");
      return data[0];
    },
  });

  const { data: files } = useQuery({
    queryKey: ["gallery-files", gallery?.id],
    enabled: !!gallery?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_files")
        .select("*")
        .eq("gallery_id", gallery!.id)
        .order("is_pinned", { ascending: false })
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!files?.length) return;
    const all = files.flatMap((f) => [f.thumb_path, f.web_path, f.original_path].filter(Boolean) as string[]);
    signedUrls(all, 7200).then(setUrls).catch(() => {});
  }, [files]);

  const { data: favorites, refetch: refetchFavs } = useQuery({
    queryKey: ["gallery-favs", gallery?.id, sessionId],
    enabled: !!gallery?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_favorites")
        .select("file_id")
        .eq("gallery_id", gallery!.id)
        .eq("session_id", sessionId);
      if (error) throw error;
      return new Set(data?.map((d) => d.file_id) ?? []);
    },
  });

  useEffect(() => {
    if (gallery?.id) supabase.rpc("increment_gallery_view", { _gallery_id: gallery.id });
  }, [gallery?.id]);

  const toggleFav = async (fileId: string) => {
    if (!gallery) return;
    if (favorites?.has(fileId)) {
      await supabase.rpc("remove_gallery_favorite", { _file_id: fileId, _session_id: sessionId });
    } else {
      await supabase.from("gallery_favorites").insert({ gallery_id: gallery.id, file_id: fileId, session_id: sessionId });
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
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gallery-download-zip?slug=${gallery.slug}`,
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

  if (error || !gallery) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center">
      <h1 className="font-heading text-3xl mb-2">Galeria não encontrada</h1>
      <p className="text-muted-foreground mb-6">Verifique o link recebido.</p>
      <Link to="/" className="text-primary underline">Voltar ao site</Link>
    </div>
  );

  const design = mergeDesign((gallery as any).design_settings);
  const heroUrl = gallery.cover_url ?? (files?.[0] && urls[files[0].web_path]);
  const ctaUrl = `https://wa.me/5547997096098?text=${encodeURIComponent(`Olá! Vim da galeria de ${gallery.couple_names}.`)}`;

  return (
    <>
      <Helmet>
        <title>{gallery.couple_names} — Racun Weddings</title>
        <meta name="description" content={gallery.description ?? `Galeria privada de ${gallery.couple_names}`} />
        <meta name="robots" content="noindex,nofollow" />
        <meta property="og:title" content={gallery.couple_names} />
        {heroUrl && <meta property="og:image" content={heroUrl} />}
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
