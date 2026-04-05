import { Star } from "lucide-react";
import AnimatedSection from "./AnimatedSection";
import { useTestimonials } from "@/hooks/useSiteContent";

const defaultTestimonials = [
  { id: "1", couple_name: "Mariana & Lucas", text: "Cada vez que assistimos ao nosso filme, sentimos tudo de novo. A Racun capturou não só imagens, mas a essência do nosso dia.", location: "Florianópolis, SC", photo_url: null },
  { id: "2", couple_name: "Fernanda & Gustavo", text: "A equipe foi tão discreta que esquecemos que estavam ali, mas o resultado mostra que não perderam nenhum momento especial.", location: "Joinville, SC", photo_url: null },
  { id: "3", couple_name: "Isabela & Thiago", text: "O vídeo ficou melhor do que qualquer coisa que poderíamos imaginar. É cinema de verdade. Choramos de felicidade ao ver.", location: "Balneário Camboriú, SC", photo_url: null },
];

const Testimonials = () => {
  const { testimonials, isLoading } = useTestimonials();

  const displayTestimonials = testimonials && testimonials.length > 0
    ? testimonials.filter((t: any) => t.is_active)
    : defaultTestimonials;

  return (
    <section className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6 max-w-5xl">
        <AnimatedSection className="text-center mb-16">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-4">Depoimentos</p>
          <h2 className="font-heading text-3xl md:text-5xl font-light text-foreground">
            O que nossos casais dizem
          </h2>
        </AnimatedSection>

        <div className="grid md:grid-cols-3 gap-8">
          {displayTestimonials.map((t: any, i: number) => (
            <AnimatedSection key={t.id} delay={i * 0.15}>
              <div className="bg-card border border-border p-8 rounded-sm h-full flex flex-col">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} size={14} className="text-gold fill-gold" />
                  ))}
                </div>
                <p className="font-body text-sm text-muted-foreground leading-relaxed flex-1 italic">
                  "{t.text}"
                </p>
                <div className="mt-6 pt-4 border-t border-border flex items-center gap-3">
                  {t.photo_url && (
                    <img src={t.photo_url} alt={t.couple_name} className="w-10 h-10 rounded-full object-cover" />
                  )}
                  <div>
                    <p className="font-heading text-base font-medium text-foreground">{t.couple_name}</p>
                    <p className="font-body text-xs text-muted-foreground">{t.location}</p>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
