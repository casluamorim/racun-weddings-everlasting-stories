import { useSiteContent } from "@/hooks/useSiteContent";
import { Film, Camera } from "lucide-react";
import AnimatedSection from "./AnimatedSection";

const iconMap: Record<string, React.ReactNode> = {
  film: <Film size={24} className="text-primary" />,
  camera: <Camera size={24} className="text-primary" />,
};

const extractYoutubeId = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|v=|\/embed\/)([\w-]{11})/);
  return match?.[1] ?? "";
};

const Services = () => {
  const { getValue } = useSiteContent("services");

  const sectionLabel = getValue("services", "section_label", "Nossos Serviços");
  const title = getValue("services", "title", "Cada casamento é único");
  const subtitle = getValue("services", "subtitle", "Projetos personalizados que capturam a essência do seu grande dia");
  const items: { title: string; icon: string; image_url: string; video_url?: string }[] = getValue("services", "items", [
    { title: "Vídeo de Casamento", icon: "film", image_url: "", video_url: "" },
    { title: "Fotografia de Casamento", icon: "camera", image_url: "", video_url: "" },
  ]);

  return (
    <section id="servicos" className="py-24 md:py-32 bg-section-light">
      <div className="container mx-auto px-6 max-w-6xl">
        <AnimatedSection className="text-center mb-16">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-4">
            {sectionLabel}
          </p>
          <h2 className="font-heading text-3xl md:text-5xl font-light text-foreground mb-4">
            {title}
          </h2>
          <p className="font-body text-sm md:text-base text-muted-foreground max-w-xl mx-auto">
            {subtitle}
          </p>
          <div className="w-12 h-[2px] bg-foreground/30 mx-auto mt-6" />
        </AnimatedSection>

        <AnimatedSection>
          <div className="grid md:grid-cols-2 gap-6">
            {items.map((item, i) => {
              const ytId = item.video_url ? extractYoutubeId(item.video_url) : "";
              return (
                <div
                  key={i}
                  className="relative group overflow-hidden rounded-xl aspect-[4/3] bg-muted"
                >
                  {ytId ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1`}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      style={{ transform: "scale(1.3)", transformOrigin: "center center" }}
                      allow="autoplay; fullscreen"
                      frameBorder="0"
                      title={item.title}
                    />
                  ) : item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/10" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
                  <div className="absolute bottom-6 left-6 flex items-center gap-3 pointer-events-none">
                    <div className="w-10 h-10 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center">
                      {iconMap[item.icon] ?? <Camera size={24} className="text-primary" />}
                    </div>
                    <span className="font-heading text-lg text-white">{item.title}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
};

export default Services;
