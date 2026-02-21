import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Play, X } from "lucide-react";
import AnimatedSection from "./AnimatedSection";

const Portfolio = () => {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const { data: weddings } = useQuery({
    queryKey: ["public-weddings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weddings")
        .select("id, couple_names, city, cover_photo_url")
        .eq("is_published", true)
        .order("date", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  const weddingIds = weddings?.map((w) => w.id) ?? [];

  const { data: photos } = useQuery({
    queryKey: ["public-photos", weddingIds],
    enabled: weddingIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_photos")
        .select("id, photo_url, caption, wedding_id")
        .in("wedding_id", weddingIds)
        .order("sort_order")
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  const { data: videos } = useQuery({
    queryKey: ["public-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_videos")
        .select("id, title, youtube_url, is_featured")
        .order("sort_order")
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  const extractYoutubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|v=|\/embed\/)([\w-]{11})/);
    return match?.[1] ?? "";
  };

  const displayPhotos = photos && photos.length > 0
    ? photos
    : null;

  const displayVideos = videos && videos.length > 0
    ? videos
    : null;

  return (
    <section id="portfolio" className="py-24 md:py-32 bg-section-dark">
      <div className="container mx-auto px-6 max-w-6xl">
        <AnimatedSection className="text-center mb-16">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-4">Portfólio</p>
          <h2 className="font-heading text-3xl md:text-5xl font-light text-section-dark-foreground">
            Histórias que nos emocionam
          </h2>
        </AnimatedSection>

        {/* Videos */}
        {displayVideos && (
          <AnimatedSection className="mb-20">
            <h3 className="font-heading text-xl text-section-dark-foreground/80 mb-8 text-center">Filmes</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {displayVideos.map((v) => {
                const ytId = extractYoutubeId(v.youtube_url);
                return (
                  <div
                    key={v.id}
                    className="group cursor-pointer relative aspect-video overflow-hidden rounded-sm"
                    onClick={() => setActiveVideo(ytId)}
                  >
                    <img
                      src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
                      alt={v.title || "Vídeo de casamento"}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-hero/40 group-hover:bg-hero/20 transition-colors flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full border-2 border-primary-foreground/80 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play size={20} className="text-primary-foreground ml-1" fill="currentColor" />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-hero/80 to-transparent">
                      <p className="font-heading text-sm text-hero-foreground">{v.title}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </AnimatedSection>
        )}

        {/* Photos */}
        {displayPhotos && (
          <AnimatedSection>
            <h3 className="font-heading text-xl text-section-dark-foreground/80 mb-8 text-center">Fotografias</h3>
            <div className="columns-2 md:columns-3 gap-4 space-y-4">
              {displayPhotos.map((p) => (
                <div key={p.id} className="break-inside-avoid overflow-hidden rounded-sm">
                  <img
                    src={p.photo_url}
                    alt={p.caption || "Fotografia de casamento"}
                    className="w-full object-cover hover:scale-105 transition-transform duration-700"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </AnimatedSection>
        )}

        {!displayVideos && !displayPhotos && (
          <p className="font-body text-sm text-section-dark-foreground/50 text-center">
            Em breve, novas histórias aqui.
          </p>
        )}
      </div>

      {/* Video modal */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 bg-hero/90 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setActiveVideo(null)}
        >
          <button
            className="absolute top-6 right-6 text-hero-foreground/80 hover:text-hero-foreground"
            onClick={() => setActiveVideo(null)}
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
    </section>
  );
};

export default Portfolio;
