import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Heart, Download, Share2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { signedUrls, GALLERY_BUCKET } from "@/lib/galleryStorage";

const SESSION_KEY = "racun-gallery-session";

function getSessionId(): string {
  let s = localStorage.getItem(SESSION_KEY);
  if (!s) {
    s = crypto.randomUUID().replace(/-/g, "");
    localStorage.setItem(SESSION_KEY, s);
  }
  return s;
}

const GalleryView = () => {
  const { slug } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const sessionId = useMemo(getSessionId, []);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const { data: gallery, isLoading, error } = useQuery({
    queryKey: ["gallery", slug, token],
    enabled: !!slug && !!token,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_gallery_by_token", { _slug: slug!, _token: token });
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
    a.href = url;
    a.download = f.file_name;
    a.target = "_blank";
    a.click();
  };

  const downloadAll = async () => {
    if (!gallery) return;
    toast.loading("Preparando ZIP...", { id: "zip" });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gallery-download-zip?slug=${gallery.slug}&token=${token}`,
        { headers: session ? { Authorization: `Bearer ${session.access_token}` } : {} }
      );
      if (!res.ok) throw new Error("Falha");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${gallery.slug}.zip`;
      a.click();
      toast.success("Download iniciado!", { id: "zip" });
    } catch {
      toast.error("Erro ao gerar ZIP", { id: "zip" });
    }
  };

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: gallery?.couple_names, url }); } catch {}
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copiado!");
    }
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

  const photos = files?.filter((f) => f.kind === "photo") ?? [];
  const videos = files?.filter((f) => f.kind === "video") ?? [];
  const heroUrl = gallery.cover_url ?? (files?.[0] && urls[files[0].web_path]);

  return (
    <>
      <Helmet>
        <title>{gallery.couple_names} — Racun Weddings</title>
        <meta name="description" content={gallery.description ?? `Galeria privada de ${gallery.couple_names}`} />
        <meta name="robots" content="noindex,nofollow" />
        <meta property="og:title" content={gallery.couple_names} />
        {heroUrl && <meta property="og:image" content={heroUrl} />}
      </Helmet>

      <div className="min-h-screen bg-background text-foreground">
        {/* Hero */}
        <section className="relative h-[90vh] flex items-end overflow-hidden">
          {heroUrl && <img src={heroUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          <div className="relative z-10 p-8 md:p-16 text-white max-w-3xl">
            <p className="font-body text-xs tracking-[0.3em] uppercase opacity-80">Racun Weddings</p>
            <h1 className="font-heading text-5xl md:text-7xl mt-4">{gallery.couple_names}</h1>
            <p className="font-body mt-4 opacity-90">
              {gallery.event_date && new Date(gallery.event_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              {gallery.venue && ` · ${gallery.venue}`}
              {gallery.city && ` · ${gallery.city}`}
            </p>
            {gallery.description && <p className="font-body mt-6 text-lg opacity-90 max-w-xl">{gallery.description}</p>}
          </div>
        </section>

        {/* Actions */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="font-body text-sm text-muted-foreground">{photos.length} fotos · {videos.length} vídeos</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={share}><Share2 className="h-4 w-4 mr-1" />Compartilhar</Button>
              <Button size="sm" onClick={downloadAll}><Download className="h-4 w-4 mr-1" />Baixar tudo</Button>
            </div>
          </div>
        </div>

        {/* Story */}
        {gallery.story && (
          <section className="max-w-2xl mx-auto px-6 py-20 text-center">
            <p className="font-heading text-2xl md:text-3xl leading-relaxed italic">"{gallery.story}"</p>
          </section>
        )}

        {/* Videos */}
        {videos.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 py-8 space-y-4">
            <h2 className="font-heading text-2xl">Filme</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {videos.map((v) => urls[v.web_path] && (
                <video key={v.id} src={urls[v.web_path]} controls className="w-full rounded bg-black" preload="metadata" />
              ))}
            </div>
          </section>
        )}

        {/* Photo grid */}
        <section className="max-w-7xl mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {photos.map((f, idx) => {
              const thumb = urls[f.thumb_path || f.web_path];
              const isFav = favorites?.has(f.id);
              return (
                <div key={f.id} className="relative group aspect-[3/4] bg-muted overflow-hidden">
                  {thumb ? (
                    <img src={thumb} alt="" loading="lazy" onClick={() => setActiveIdx(idx)}
                         className="w-full h-full object-cover cursor-pointer transition-transform duration-700 group-hover:scale-105" />
                  ) : <Skeleton className="w-full h-full" />}
                  <button onClick={(e) => { e.stopPropagation(); toggleFav(f.id); }}
                          className="absolute top-2 right-2 p-2 rounded-full bg-black/50 backdrop-blur opacity-0 group-hover:opacity-100 transition">
                    <Heart className={`h-4 w-4 ${isFav ? "fill-primary text-primary" : "text-white"}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-foreground text-background py-24 px-6 text-center mt-20">
          <p className="font-body text-xs tracking-[0.3em] uppercase opacity-60">Racun Weddings</p>
          <h2 className="font-heading text-4xl md:text-6xl mt-4 max-w-3xl mx-auto">Seu casamento também merece ser contado assim.</h2>
          <div className="flex gap-3 justify-center mt-8 flex-wrap">
            <Button asChild size="lg" variant="secondary"><Link to="/#contato">Solicitar orçamento</Link></Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-background text-background hover:bg-background hover:text-foreground">
              <a href={`https://wa.me/5547997096098?text=${encodeURIComponent(`Olá! Vim da galeria de ${gallery.couple_names}.`)}`} target="_blank" rel="noopener">Falar no WhatsApp</a>
            </Button>
          </div>
        </section>

        {/* Lightbox */}
        <Dialog open={activeIdx !== null} onOpenChange={(o) => !o && setActiveIdx(null)}>
          <DialogContent className="max-w-7xl w-full p-0 bg-black border-none">
            {activeIdx !== null && photos[activeIdx] && (
              <div className="relative">
                <img src={urls[photos[activeIdx].web_path]} alt="" className="w-full max-h-[90vh] object-contain" />
                <div className="absolute top-2 right-2 flex gap-2">
                  <Button size="icon" variant="secondary" onClick={() => toggleFav(photos[activeIdx].id)}>
                    <Heart className={`h-4 w-4 ${favorites?.has(photos[activeIdx].id) ? "fill-primary text-primary" : ""}`} />
                  </Button>
                  <Button size="icon" variant="secondary" onClick={() => downloadOne(photos[activeIdx])}><Download className="h-4 w-4" /></Button>
                  <Button size="icon" variant="secondary" onClick={() => setActiveIdx(null)}><X className="h-4 w-4" /></Button>
                </div>
                {activeIdx > 0 && (
                  <Button size="icon" variant="secondary" className="absolute left-2 top-1/2 -translate-y-1/2" onClick={() => setActiveIdx(activeIdx - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                {activeIdx < photos.length - 1 && (
                  <Button size="icon" variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setActiveIdx(activeIdx + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default GalleryView;
