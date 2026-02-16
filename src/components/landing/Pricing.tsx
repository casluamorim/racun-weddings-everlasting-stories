import { Check, Crown, MessageCircle, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPlanWhatsAppUrl, getGeneralWhatsAppUrl } from "@/lib/whatsapp";
import AnimatedSection from "./AnimatedSection";

interface Plan {
  name: string;
  displayName: string;
  category: string;
  price: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
}

const photoPlans: Plan[] = [
  {
    name: "Foto Essencial",
    displayName: "Essencial",
    category: "FOTOGRAFIA",
    price: "R$ 3.200",
    features: ["Cobertura parcial do evento", "Registro espontâneo e documental", "Galeria online privada com fotos tratadas", "Entrega em alta resolução"],
  },
  {
    name: "Foto Clássico",
    displayName: "Clássico",
    category: "FOTOGRAFIA",
    price: "R$ 4.800",
    features: ["Cobertura estendida do casamento", "Registro completo da cerimônia e recepção", "Galeria online privada", "Álbum digital"],
  },
  {
    name: "Foto Signature",
    displayName: "Signature",
    category: "FOTOGRAFIA",
    price: "R$ 6.900",
    features: ["Cobertura completa do grande dia", "Curadoria artística das imagens", "Galeria online privada", "Álbum premium", "Sessão pré-casamento"],
    highlight: true,
  },
];

const videoPlans: Plan[] = [
  {
    name: "Vídeo Essencial",
    displayName: "Essencial",
    category: "VÍDEO",
    price: "R$ 4.200",
    features: ["Cobertura parcial", "Trailer cinematográfico com narrativa emocional", "Entrega digital em alta qualidade"],
  },
  {
    name: "Vídeo Cinematográfico",
    displayName: "Cinematográfico",
    category: "VÍDEO",
    price: "R$ 5.900",
    features: ["Cobertura estendida", "Trailer cinematográfico", "Teaser curto para redes sociais", "Entrega digital"],
  },
  {
    name: "Vídeo Signature",
    displayName: "Signature",
    category: "VÍDEO",
    price: "R$ 8.500",
    features: [
      "Cobertura completa do casamento",
      "Trailer cinematográfico",
      "Filme completo com storytelling personalizado",
      "Entrega digital e mídia física",
    ],
    highlight: true,
  },
];

const combos: Plan[] = [
  {
    name: "Combo Clássico",
    displayName: "Combo Clássico",
    category: "FOTO + VÍDEO",
    price: "R$ 9.500",
    features: ["Fotografia e vídeo com cobertura estendida", "Galeria online completa", "Trailer cinematográfico", "Álbum digital"],
  },
  {
    name: "Combo Signature",
    displayName: "Combo Signature",
    category: "FOTO + VÍDEO",
    price: "R$ 13.900",
    features: [
      "Cobertura completa de fotografia e vídeo",
      "Trailer + filme completo",
      "Sessão pré-casamento",
      "Álbum premium",
      "Teasers para redes sociais",
    ],
    highlight: true,
    badge: "Mais escolhido",
  },
];

const PlanCard = ({ plan }: { plan: Plan }) => (
  <div
    className={`relative p-6 md:p-8 rounded-lg border flex flex-col h-full transition-all ${
      plan.highlight
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
      <p className={`font-body text-xs uppercase tracking-[0.25em] mb-3 ${plan.highlight ? "text-primary" : "text-primary"}`}>
        {plan.category}
      </p>
      <h3 className={`font-heading text-2xl md:text-3xl italic ${plan.highlight ? "text-section-dark-foreground" : "text-foreground"}`}>
        {plan.displayName}
      </h3>
      <div className="w-10 h-[2px] bg-primary mx-auto mt-4" />
    </div>

    <ul className="space-y-3.5 flex-1 mb-8">
      {plan.features.map((f) => (
        <li key={f} className={`flex items-start gap-3 text-sm font-body ${plan.highlight ? "text-section-dark-foreground/80" : "text-muted-foreground"}`}>
          <Check size={16} className="text-primary mt-0.5 flex-shrink-0" />
          {f}
        </li>
      ))}
    </ul>

    <div className="space-y-3 mt-auto">
      <Button
        variant="cta"
        className="w-full uppercase tracking-wider text-xs py-5"
        asChild
      >
        <a href={getPlanWhatsAppUrl(plan.name)} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={16} />
          {combos.includes(plan) ? "Quero este combo" : "Quero este plano"}
        </a>
      </Button>
      <Button
        variant={plan.highlight ? "hero-outline" : "outline"}
        className={`w-full uppercase tracking-wider text-xs py-5 ${plan.highlight ? "border-section-dark-foreground/30 text-section-dark-foreground hover:bg-section-dark-foreground/10" : ""}`}
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

const SectionHeader = ({ label, title, subtitle }: { label: string; title: string; subtitle?: string }) => (
  <div className="text-center mb-10 md:mb-12">
    <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-3">{label}</p>
    <h3 className="font-heading text-2xl md:text-4xl font-light text-foreground">{title}</h3>
    {subtitle && (
      <p className="font-body text-sm text-muted-foreground max-w-lg mx-auto mt-3">{subtitle}</p>
    )}
    <div className="w-12 h-[2px] bg-primary mx-auto mt-5" />
  </div>
);

const Pricing = () => (
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

      {/* Photo plans */}
      <AnimatedSection className="mb-20 md:mb-24">
        <SectionHeader label="Fotografia" title="Planos de Fotografia" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {photoPlans.map((p) => (
            <PlanCard key={p.name} plan={p} />
          ))}
        </div>
      </AnimatedSection>

      {/* Video plans */}
      <AnimatedSection className="mb-20 md:mb-24">
        <SectionHeader label="Vídeo" title="Planos de Vídeo" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {videoPlans.map((p) => (
            <PlanCard key={p.name} plan={p} />
          ))}
        </div>
      </AnimatedSection>

      {/* Combos */}
      <AnimatedSection className="bg-section-dark rounded-xl p-6 md:p-12">
        <SectionHeader
          label="Experiência Completa"
          title="Combos Foto + Vídeo"
          subtitle="A combinação perfeita para eternizar cada momento com imagens e narrativa cinematográfica."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 max-w-4xl mx-auto">
          {combos.map((p) => (
            <PlanCard key={p.name} plan={p} />
          ))}
        </div>
      </AnimatedSection>
    </div>
  </section>
);

export default Pricing;
