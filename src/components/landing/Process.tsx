import { MessageCircle, CalendarDays, Clapperboard, Sparkles, Heart } from "lucide-react";
import AnimatedSection from "./AnimatedSection";

const steps = [
  { num: "01", icon: MessageCircle, title: "Primeiro Contato", desc: "Conversamos para entender vocês, a história e o que sonham para o grande dia." },
  { num: "02", icon: CalendarDays, title: "Alinhamento", desc: "Definimos expectativas, estilo e todos os detalhes para a cobertura perfeita." },
  { num: "03", icon: Clapperboard, title: "O Grande Dia", desc: "Estamos presentes de forma discreta, capturando cada momento com sensibilidade." },
  { num: "04", icon: Sparkles, title: "Pós-Produção", desc: "Cada filme é editado com cuidado artesanal, criando uma narrativa única." },
  { num: "05", icon: Heart, title: "Entrega Final", desc: "O momento de reviver tudo. Uma entrega pensada para emocionar." },
];

const Process = () => (
  <section className="py-20 md:py-28 bg-accent">
    <div className="container mx-auto px-4 md:px-6 max-w-3xl">
      <AnimatedSection className="text-center mb-12 md:mb-16">
        <h2 className="font-heading text-3xl md:text-5xl font-light text-foreground">
          Como trabalhamos
        </h2>
        <p className="font-body text-sm text-muted-foreground mt-3">
          Do primeiro contato à entrega, cuidamos de cada detalhe
        </p>
        <div className="w-12 h-[2px] bg-foreground/30 mx-auto mt-5" />
      </AnimatedSection>

      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[27px] md:left-[31px] top-6 bottom-6 w-[2px] bg-border" />

        <div className="space-y-8 md:space-y-10">
          {steps.map((s, i) => (
            <AnimatedSection key={s.num} delay={i * 0.1}>
              <div className="flex items-start gap-5 md:gap-7 relative">
                {/* Icon circle with number badge */}
                <div className="relative flex-shrink-0 z-10">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-border bg-background flex items-center justify-center">
                    <s.icon size={22} className="text-primary" strokeWidth={1.5} />
                  </div>
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] font-body font-semibold flex items-center justify-center">
                    {s.num}
                  </span>
                </div>

                {/* Content */}
                <div className="pt-2 md:pt-3">
                  <h3 className="font-heading text-lg md:text-xl font-semibold text-foreground mb-1">
                    {s.title}
                  </h3>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default Process;
