import { Check, Crown, MessageCircle, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPlanWhatsAppUrl, getGeneralWhatsAppUrl } from "@/lib/whatsapp";
import AnimatedSection from "./AnimatedSection";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Plan {
  id: string;
  name: string;
  display_name: string;
  category: string;
  price: string;
  features: string[];
  is_highlighted: boolean;
  badge: string | null;
}

const PlanCard = ({ plan, isCombo }: { plan: Plan; isCombo?: boolean }) => (
  <div
    className={`relative p-6 md:p-8 rounded-lg border flex flex-col h-full transition-all ${
      plan.is_highlighted
        ? "bg-section-dark text-section-dark-foreground border-border/30 shadow-2xl"
        : "bg-card text-card-foreground border-border hover:shadow-lg"
    }`}
  >
    {plan.badge && (
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-5 py-1.5 text-[10px] font-body uppercase tracking-[0.2em] rounded-full flex items-center gap-1.5 whitespace-nowrap">
        <Crown size={12} />
        {plan.badge}
      </div>
    )}

    <div className="text-center mb-6">
      <p className="font-body text-xs uppercase tracking-[0.25em] mb-3 text-primary">
        {plan.category === "foto" ? "FOTOGRAFIA" : plan.category === "video" ? "VÍDEO" : "FOTO + VÍDEO"}
      </p>
      <h3 className={`font-heading text-2xl md:text-3xl italic ${plan.is_highlighted ? "text-section-dark-foreground" : "text-foreground"}`}>
        {plan.display_name}
      </h3>
      <div className="w-10 h-[2px] bg-primary mx-auto mt-4" />
    </div>

    <ul className="space-y-3.5 flex-1 mb-8">
      {plan.features.map((f) => (
        <li key={f} className={`flex items-start gap-3 text-sm font-body ${plan.is_highlighted ? "text-section-dark-foreground/80" : "text-muted-foreground"}`}>
          <Check size={16} className="text-primary mt-0.5 flex-shrink-0" />
          {f}
        </li>
      ))}
    </ul>

    <div className="space-y-3 mt-auto">
      <Button variant="cta" className="w-full uppercase tracking-wider text-xs py-5" asChild>
        <a href={getPlanWhatsAppUrl(plan.name)} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={16} />
          {isCombo ? "Quero este combo" : "Quero este plano"}
        </a>
      </Button>
      <Button
        variant={plan.is_highlighted ? "hero-outline" : "outline"}
        className={`w-full uppercase tracking-wider text-xs py-5 ${plan.is_highlighted ? "border-section-dark-foreground/30 text-section-dark-foreground hover:bg-section-dark-foreground/10" : ""}`}
        asChild
      >
        <a href={getGeneralWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
          <CalendarDays size={16} />
          Reservar minha data
        </a>
      </Button>
    </div>
  </div>
);

const SectionHeader = ({ label, title, subtitle, dark }: { label: string; title: string; subtitle?: string; dark?: boolean }) => (
  <div className="text-center mb-10 md:mb-12">
    <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-3">{label}</p>
    <h3 className={`font-heading text-2xl md:text-4xl font-light ${dark ? "text-section-dark-foreground" : "text-foreground"}`}>{title}</h3>
    {subtitle && (
      <p className={`font-body text-sm max-w-lg mx-auto mt-3 ${dark ? "text-section-dark-foreground/60" : "text-muted-foreground"}`}>{subtitle}</p>
    )}
    <div className="w-12 h-[2px] bg-primary mx-auto mt-5" />
  </div>
);

const Pricing = () => {
  const { data: plans } = useQuery({
    queryKey: ["public-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Plan[];
    },
  });

  const photoPlans = plans?.filter((p) => p.category === "foto") ?? [];
  const videoPlans = plans?.filter((p) => p.category === "video") ?? [];
  const combos = plans?.filter((p) => p.category === "combo") ?? [];

  if (!plans || plans.length === 0) return null;

  return (
    <section id="investimento" className="py-20 md:py-32 bg-background">
      <div className="container mx-auto px-4 md:px-6 max-w-6xl">
        <AnimatedSection className="text-center mb-16 md:mb-20">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-4">Investimento</p>
          <h2 className="font-heading text-3xl md:text-5xl font-light text-foreground mb-4">
            Um investimento em memórias que permanecem
          </h2>
          <p className="font-body text-sm text-muted-foreground max-w-xl mx-auto">
            Poucos formatos de cobertura, todos personalizáveis conforme local, data e necessidades do evento.
          </p>
        </AnimatedSection>

        {photoPlans.length > 0 && (
          <AnimatedSection className="mb-20 md:mb-24">
            <SectionHeader label="Fotografia" title="Planos de Fotografia" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
              {photoPlans.map((p) => (
                <PlanCard key={p.id} plan={p} />
              ))}
            </div>
          </AnimatedSection>
        )}

        {videoPlans.length > 0 && (
          <AnimatedSection className="mb-20 md:mb-24">
            <SectionHeader label="Vídeo" title="Planos de Vídeo" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
              {videoPlans.map((p) => (
                <PlanCard key={p.id} plan={p} />
              ))}
            </div>
          </AnimatedSection>
        )}

        {combos.length > 0 && (
          <AnimatedSection className="bg-section-dark rounded-xl p-6 md:p-12">
            <SectionHeader
              dark
              label="Experiência Completa"
              title="Combos Foto + Vídeo"
              subtitle="A combinação perfeita para eternizar cada momento com imagens e narrativa cinematográfica."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 max-w-4xl mx-auto">
              {combos.map((p) => (
                <PlanCard key={p.id} plan={p} isCombo />
              ))}
            </div>
          </AnimatedSection>
        )}
      </div>
    </section>
  );
};

export default Pricing;
