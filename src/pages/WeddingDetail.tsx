import { useState } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Play, X, ArrowLeft } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import AnimatedSection from "@/components/landing/AnimatedSection";

const extractYoutubeId = (url: string) => {
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([\w-]{11})/);
  return m?.[1] ?? "";
};

const WeddingDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const { data: wedding, isLoading, isError } = useQuery({
    queryKey: ["wedding-detail", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weddings")
        .select("*")
        .eq("slug", slug!)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: photos } = useQuery({
    queryKey: ["wedding-photos", wedding?.id],
    enabled: !!wedding?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_photos")
        .select("id, photo_url, caption")
        .eq("wedding_id", wedding!.id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: videos } = useQuery({
    queryKey: ["wedding-videos", wedding?.id],
    enabled: !!wedding?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_videos")
        .select("id, title, youtube_url")
        .eq("wedding_id", wedding!.id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="font-body text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (isError || !wedding) {
    return <Navigate to="/portfolio" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {/* Hero */}
      <header className="relative pt-32 pb-16 bg-hero text-hero-foreground">
        {wedding.cover_photo_url && (
          <div className="absolute inset-0 opacity-30">
            <img src={wedding.cover_photo_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="relative container mx-auto px-6 max-w-5xl text-center">
          <Link
            to="/portfolio"
            className="inline-flex items-center gap-2 font-body text-xs uppercase tracking-[0.25em] text-hero-foreground/70 hover:text-hero-foreground mb-6"
          >
            <ArrowLeft size={14} /> Voltar ao portfólio
          </Link>
          <h1 className="font-heading text-4xl md:text-6xl font-light mb-4">{wedding.couple_names}</h1>
          <p className="font-body text-xs md:text-sm uppercase tracking-[0.25em] text-hero-foreground/80">
            {[wedding.city, wedding.venue].filter(Boolean).join(" • ")}
            {wedding.date && ` • ${new Date(wedding.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`}
          </p>
        </div>
      </header>

      <main className="py-16 md:py-24">
        <div className="container mx-auto px-6 max-w-5xl">
          {wedding.description && (
            <AnimatedSection className="max-w-2xl mx-auto text-center mb-16">
              <p className="font-body text-base leading-relaxed text-muted-foreground italic">
                {wedding.description}
              </p>
            </AnimatedSection>
          )}

          {videos && videos.length > 0 && (
            <AnimatedSection className="mb-16">
              <h2 className="font-heading text-xl text-foreground/80 mb-6 text-center">Filme</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {videos.map((v) => {
                  const id = extractYoutubeId(v.youtube_url);
                  return (
                    <div
                      key={v.id}
                      className="group cursor-pointer relative aspect-video overflow-hidden rounded-sm"
                      onClick={() => setActiveVideo(id)}
                    >
                      <img
                        src={`https://img.youtube.com/vi/${id}/maxresdefault.jpg`}
                        alt={v.title || ""}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-hero/40 group-hover:bg-hero/20 transition-colors flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full border-2 border-primary-foreground/80 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play size={20} className="text-primary-foreground ml-1" fill="currentColor" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AnimatedSection>
          )}

          {photos && photos.length > 0 && (
            <AnimatedSection>
              <h2 className="font-heading text-xl text-foreground/80 mb-6 text-center">Galeria</h2>
              <div className="columns-2 md:columns-3 gap-4 space-y-4">
                {photos.map((p) => (
                  <div key={p.id} className="break-inside-avoid overflow-hidden rounded-sm">
                    <img
                      src={p.photo_url}
                      alt={p.caption || wedding.couple_names}
                      loading="lazy"
                      className="w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </AnimatedSection>
          )}

          {(!videos || videos.length === 0) && (!photos || photos.length === 0) && (
            <p className="text-center font-body text-muted-foreground">Conteúdo em breve.</p>
          )}
        </div>
      </main>

      {activeVideo && (
        <div
          className="fixed inset-0 z-50 bg-hero/90 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setActiveVideo(null)}
        >
          <button
            className="absolute top-6 right-6 text-hero-foreground/80 hover:text-hero-foreground"
            onClick={() => setActiveVideo(null)}
            aria-label="Fechar"
          >
            <X size={32} />
          </button>
          <div className="w-full max-w-4xl aspect-video" onClick={(e) => e.stopPropagation()}>
            <iframe
              src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`}
              className="w-full h-full rounded-sm"
              allow="autoplay; fullscreen"
              allowFullScreen
              title="Vídeo de casamento"
            />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default WeddingDetail;
