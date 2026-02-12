import { Star } from "lucide-react";
import AnimatedSection from "./AnimatedSection";

const testimonials = [
  {
    name: "Mariana & Lucas",
    text: "Cada vez que assistimos ao nosso filme, sentimos tudo de novo. A Racun capturou não só imagens, mas a essência do nosso dia.",
    location: "Florianópolis, SC",
  },
  {
    name: "Fernanda & Gustavo",
    text: "A equipe foi tão discreta que esquecemos que estavam ali, mas o resultado mostra que não perderam nenhum momento especial.",
    location: "Joinville, SC",
  },
  {
    name: "Isabela & Thiago",
    text: "O vídeo ficou melhor do que qualquer coisa que poderíamos imaginar. É cinema de verdade. Choramos de felicidade ao ver.",
    location: "Balneário Camboriú, SC",
  },
];

const Testimonials = () => (
  <section className="py-24 md:py-32 bg-background">
    <div className="container mx-auto px-6 max-w-5xl">
      <AnimatedSection className="text-center mb-16">
        <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-4">Depoimentos</p>
        <h2 className="font-heading text-3xl md:text-5xl font-light text-foreground">
          O que nossos casais dizem
        </h2>
      </AnimatedSection>

      <div className="grid md:grid-cols-3 gap-8">
        {testimonials.map((t, i) => (
          <AnimatedSection key={t.name} delay={i * 0.15}>
            <div className="bg-card border border-border p-8 rounded-sm h-full flex flex-col">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} size={14} className="text-gold fill-gold" />
                ))}
              </div>
              <p className="font-body text-sm text-muted-foreground leading-relaxed flex-1 italic">
                "{t.text}"
              </p>
              <div className="mt-6 pt-4 border-t border-border">
                <p className="font-heading text-base font-medium text-foreground">{t.name}</p>
                <p className="font-body text-xs text-muted-foreground">{t.location}</p>
              </div>
            </div>
          </AnimatedSection>
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;
