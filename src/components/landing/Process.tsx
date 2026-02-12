import AnimatedSection from "./AnimatedSection";

const steps = [
  { num: "01", title: "Contato e entendimento", desc: "Conhecemos vocês, a história e o estilo do casamento." },
  { num: "02", title: "Alinhamento de expectativas", desc: "Definimos juntos a abordagem, linguagem visual e detalhes." },
  { num: "03", title: "Cobertura discreta", desc: "Capturamos cada momento com presença que não interfere." },
  { num: "04", title: "Edição cuidadosa", desc: "Criamos uma narrativa personalizada, feita sob medida." },
  { num: "05", title: "Entrega emocional", desc: "O resultado final pensado para emocionar e surpreender." },
];

const Process = () => (
  <section className="py-24 md:py-32 bg-accent">
    <div className="container mx-auto px-6 max-w-4xl">
      <AnimatedSection className="text-center mb-16">
        <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-4">Nosso processo</p>
        <h2 className="font-heading text-3xl md:text-5xl font-light text-foreground">
          Como trabalhamos
        </h2>
      </AnimatedSection>

      <div className="space-y-0">
        {steps.map((s, i) => (
          <AnimatedSection key={s.num} delay={i * 0.1}>
            <div className="flex items-start gap-6 md:gap-10 py-8 border-b border-border last:border-0 group">
              <span className="font-heading text-3xl md:text-4xl font-light text-primary/40 group-hover:text-primary transition-colors min-w-[3rem]">
                {s.num}
              </span>
              <div>
                <h3 className="font-heading text-xl md:text-2xl font-medium text-foreground mb-1">
                  {s.title}
                </h3>
                <p className="font-body text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          </AnimatedSection>
        ))}
      </div>
    </div>
  </section>
);

export default Process;
