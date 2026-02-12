import { Check, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPlanWhatsAppUrl } from "@/lib/whatsapp";
import AnimatedSection from "./AnimatedSection";

interface Plan {
  name: string;
  price: string;
  features: string[];
  highlight?: boolean;
  badge?: string;
}

const photoPlans: Plan[] = [
  {
    name: "Foto Essencial",
    price: "R$ 3.200",
    features: ["Cobertura parcial", "Galeria online privada", "Fotos tratadas em alta resolução"],
  },
  {
    name: "Foto Clássico",
    price: "R$ 4.800",
    features: ["Cobertura completa do dia", "Galeria online", "Álbum digital"],
  },
  {
    name: "Foto Signature",
    price: "R$ 6.900",
    features: ["Cobertura completa", "Curadoria artística personalizada", "Álbum premium", "Sessão pré-casamento"],
  },
];

const videoPlans: Plan[] = [
  {
    name: "Vídeo Essencial",
    price: "R$ 4.200",
    features: ["Cobertura parcial", "Trailer cinematográfico"],
  },
  {
    name: "Vídeo Cinematográfico",
    price: "R$ 5.900",
    features: ["Cobertura estendida", "Trailer + teaser para redes"],
  },
  {
    name: "Vídeo Signature",
    price: "R$ 8.500",
    features: [
      "Cobertura completa",
      "Trailer + filme completo com storytelling",
      "Captação profissional de áudio",
      "Versão longa + versão curta para redes",
    ],
  },
];

const combos: Plan[] = [
  {
    name: "Combo Clássico",
    price: "R$ 9.500",
    features: ["Foto completa", "Vídeo cinematográfico", "Galeria", "Trailer", "Álbum digital"],
  },
  {
    name: "Combo Signature",
    price: "R$ 13.900",
    features: [
      "Cobertura completa foto + vídeo",
      "Trailer + filme completo",
      "Sessão pré-casamento",
      "Álbum premium",
      "Teasers para redes",
    ],
    highlight: true,
    badge: "Mais escolhido",
  },
];

const PlanCard = ({ plan }: { plan: Plan }) => (
  <div
    className={`relative p-8 rounded-sm border flex flex-col h-full transition-all ${
      plan.highlight
        ? "border-primary bg-card shadow-xl shadow-primary/10"
        : "border-border bg-card hover:border-primary/30"
    }`}
  >
    {plan.badge && (
      <div className="absolute -top-3 left-6 bg-primary text-primary-foreground px-4 py-1 text-[10px] font-body uppercase tracking-[0.15em] rounded-sm flex items-center gap-1.5">
        <Crown size={12} />
        {plan.badge}
      </div>
    )}

    <h3 className="font-heading text-xl md:text-2xl font-medium text-foreground mb-2">{plan.name}</h3>
    <p className="font-heading text-3xl md:text-4xl font-light text-primary mb-6">{plan.price}</p>

    <ul className="space-y-3 flex-1 mb-8">
      {plan.features.map((f) => (
        <li key={f} className="flex items-start gap-3 text-sm font-body text-muted-foreground">
          <Check size={16} className="text-primary mt-0.5 flex-shrink-0" />
          {f}
        </li>
      ))}
    </ul>

    <Button
      variant={plan.highlight ? "cta" : "outline"}
      className="w-full"
      asChild
    >
      <a href={getPlanWhatsAppUrl(plan.name)} target="_blank" rel="noopener noreferrer">
        Quero este plano
      </a>
    </Button>
  </div>
);

const Pricing = () => (
  <section id="investimento" className="py-24 md:py-32 bg-background">
    <div className="container mx-auto px-6 max-w-6xl">
      <AnimatedSection className="text-center mb-6">
        <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-4">Investimento</p>
        <h2 className="font-heading text-3xl md:text-5xl font-light text-foreground mb-4">
          Um investimento em memórias que permanecem
        </h2>
        <p className="font-body text-sm text-muted-foreground max-w-xl mx-auto">
          Poucos formatos de cobertura, todos personalizáveis conforme local, data e necessidades do evento.
        </p>
      </AnimatedSection>

      {/* Photo plans */}
      <AnimatedSection className="mt-16 mb-4">
        <h3 className="font-heading text-xl text-center text-muted-foreground mb-8">Fotografia</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {photoPlans.map((p) => (
            <PlanCard key={p.name} plan={p} />
          ))}
        </div>
      </AnimatedSection>

      {/* Video plans */}
      <AnimatedSection className="mt-16 mb-4">
        <h3 className="font-heading text-xl text-center text-muted-foreground mb-8">Vídeo</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {videoPlans.map((p) => (
            <PlanCard key={p.name} plan={p} />
          ))}
        </div>
      </AnimatedSection>

      {/* Combos */}
      <AnimatedSection className="mt-16">
        <h3 className="font-heading text-xl text-center text-muted-foreground mb-8">Combos Foto + Vídeo</h3>
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {combos.map((p) => (
            <PlanCard key={p.name} plan={p} />
          ))}
        </div>
      </AnimatedSection>
    </div>
  </section>
);

export default Pricing;
