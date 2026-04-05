import { MessageCircle, CalendarDays, Clapperboard, Sparkles, Heart } from "lucide-react";
import AnimatedSection from "./AnimatedSection";
import { useSiteContent } from "@/hooks/useSiteContent";

const defaultSteps = [
  { title: "Primeiro Contato", desc: "Conversamos para entender vocês, a história e o que sonham para o grande dia." },
  { title: "Alinhamento", desc: "Definimos expectativas, estilo e todos os detalhes para a cobertura perfeita." },
  { title: "O Grande Dia", desc: "Estamos presentes de forma discreta, capturando cada momento com sensibilidade." },
  { title: "Pós-Produção", desc: "Cada filme é editado com cuidado artesanal, criando uma narrativa única." },
  { title: "Entrega Final", desc: "O momento de reviver tudo. Uma entrega pensada para emocionar." },
];

const stepIcons = [MessageCircle, CalendarDays, Clapperboard, Sparkles, Heart];

const Process = () => {
  const { getValue } = useSiteContent("process");

  const title = getValue("process", "title", "Como trabalhamos");
  const subtitle = getValue("process", "subtitle", "Do primeiro contato à entrega, cuidamos de cada detalhe");
  const steps = getValue("process", "steps", defaultSteps);

  return (
    <section className="py-20 md:py-28 bg-accent">
      <div className="container mx-auto px-4 md:px-6 max-w-3xl">
        <AnimatedSection className="text-center mb-12 md:mb-16">
          <h2 className="font-heading text-3xl md:text-5xl font-light text-foreground">{title}</h2>
          <p className="font-body text-sm text-muted-foreground mt-3">{subtitle}</p>
          <div className="w-12 h-[2px] bg-foreground/30 mx-auto mt-5" />
        </AnimatedSection>

        <div className="relative">
          <div className="absolute left-[27px] md:left-[31px] top-6 bottom-6 w-[2px] bg-border" />

          <div className="space-y-8 md:space-y-10">
            {steps.map((s: any, i: number) => {
              const Icon = stepIcons[i % stepIcons.length];
              const num = String(i + 1).padStart(2, "0");
              return (
                <AnimatedSection key={i} delay={i * 0.1}>
                  <div className="flex items-start gap-5 md:gap-7 relative">
                    <div className="relative flex-shrink-0 z-10">
                      <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border-2 border-border bg-background flex items-center justify-center">
                        <Icon size={22} className="text-primary" strokeWidth={1.5} />
                      </div>
                      <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] font-body font-semibold flex items-center justify-center">
                        {num}
                      </span>
                    </div>
                    <div className="pt-2 md:pt-3">
                      <h3 className="font-heading text-lg md:text-xl font-semibold text-foreground mb-1">{s.title}</h3>
                      <p className="font-body text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Process;
