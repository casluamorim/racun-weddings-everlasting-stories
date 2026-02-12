import { useState } from "react";
import { Play, X } from "lucide-react";
import AnimatedSection from "./AnimatedSection";

const videos = [
  { id: "dQw4w9WgXcQ", title: "Ana & Pedro – Balneário Camboriú" },
  { id: "dQw4w9WgXcQ", title: "Julia & Marcos – Joinville" },
  { id: "dQw4w9WgXcQ", title: "Camila & Rafael – Florianópolis" },
];

const photos = [
  "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=600&h=800&fit=crop",
  "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=800&fit=crop",
  "https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600&h=400&fit=crop",
  "https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=600&h=400&fit=crop",
];

const Portfolio = () => {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

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
        <AnimatedSection className="mb-20">
          <h3 className="font-heading text-xl text-section-dark-foreground/80 mb-8 text-center">Filmes</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {videos.map((v, i) => (
              <div
                key={i}
                className="group cursor-pointer relative aspect-video overflow-hidden rounded-sm"
                onClick={() => setActiveVideo(v.id)}
              >
                <img
                  src={`https://img.youtube.com/vi/${v.id}/maxresdefault.jpg`}
                  alt={v.title}
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
            ))}
          </div>
        </AnimatedSection>

        {/* Photos */}
        <AnimatedSection>
          <h3 className="font-heading text-xl text-section-dark-foreground/80 mb-8 text-center">Fotografias</h3>
          <div className="columns-2 md:columns-3 gap-4 space-y-4">
            {photos.map((src, i) => (
              <div key={i} className="break-inside-avoid overflow-hidden rounded-sm">
                <img
                  src={src}
                  alt={`Fotografia de casamento ${i + 1}`}
                  className="w-full object-cover hover:scale-105 transition-transform duration-700"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </AnimatedSection>
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
