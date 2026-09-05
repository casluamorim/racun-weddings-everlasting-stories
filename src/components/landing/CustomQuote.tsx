import { FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import AnimatedSection from "./AnimatedSection";

const EXAMPLE_URL = "https://weddings.agenciaracun.com/orcamento/ana-e-rafael";

const CustomQuote = () => {
  const goToForm = () => {
    const el = document.getElementById("contato");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section id="orcamento" className="py-20 md:py-28 bg-section-dark text-section-dark-foreground">
      <AnimatedSection>
        <div className="container mx-auto px-5 md:px-8 max-w-3xl text-center">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-3">
            Orçamento personalizado
          </p>
          <h2 className="font-heading text-3xl md:text-5xl font-light mb-5">
            Uma proposta feita só para o seu casamento
          </h2>
          <div className="w-10 h-[2px] bg-primary mx-auto mb-6" />
          <p className="font-body text-sm md:text-base text-section-dark-foreground/80 mb-9 leading-relaxed">
            Conte a data, o local e o que você imagina para o dia. Montamos uma página exclusiva
            com pacotes, fotos e vídeos escolhidos para vocês — com valores e validade claros.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button variant="cta" className="uppercase tracking-wider text-xs py-5 px-8" onClick={goToForm}>
              <Sparkles size={16} />
              Quero meu orçamento personalizado
            </Button>
            <Button
              variant="hero-outline"
              className="uppercase tracking-wider text-xs py-5 px-8 border-section-dark-foreground/30 text-section-dark-foreground hover:bg-section-dark-foreground/10"
              asChild
            >
              <a href={EXAMPLE_URL} target="_blank" rel="noopener noreferrer">
                <FileText size={16} />
                Ver exemplo de proposta
              </a>
            </Button>
          </div>
        </div>
      </AnimatedSection>
    </section>
  );
};

export default CustomQuote;
