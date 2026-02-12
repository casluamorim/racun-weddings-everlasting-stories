import { Users, Eye, Film, Palette, Calendar } from "lucide-react";
import AnimatedSection from "./AnimatedSection";

const items = [
  { icon: Users, title: "Atendimento personalizado", desc: "Cada casal é único e merece uma experiência exclusiva." },
  { icon: Eye, title: "Equipe discreta e experiente", desc: "Presença que captura tudo sem interferir nos momentos." },
  { icon: Film, title: "Narrativa cinematográfica", desc: "Seus momentos contados como um filme de verdade." },
  { icon: Palette, title: "Edição artesanal", desc: "Sem modelos prontos. Cada projeto é criado do zero." },
  { icon: Calendar, title: "Datas limitadas por ano", desc: "Garantimos dedicação total a cada casamento." },
];

const Differentials = () => (
  <section className="py-24 md:py-32 bg-background">
    <div className="container mx-auto px-6 max-w-5xl">
      <AnimatedSection className="text-center mb-16">
        <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-4">Por que nos escolher</p>
        <h2 className="font-heading text-3xl md:text-5xl font-light text-foreground">
          Exclusividade em cada detalhe
        </h2>
      </AnimatedSection>

      <div className="grid md:grid-cols-5 gap-8">
        {items.map((item, i) => (
          <AnimatedSection key={item.title} delay={i * 0.1} className="text-center group">
            <div className="mx-auto w-12 h-12 flex items-center justify-center mb-4 text-primary/70 group-hover:text-primary transition-colors">
              <item.icon size={24} strokeWidth={1.5} />
            </div>
            <h3 className="font-heading text-lg font-medium text-foreground mb-2">{item.title}</h3>
            <p className="font-body text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
          </AnimatedSection>
        ))}
      </div>
    </div>
  </section>
);

export default Differentials;
