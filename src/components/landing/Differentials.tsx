import { Heart, Hash, Users, Camera, Scissors, Film, CameraIcon } from "lucide-react";
import AnimatedSection from "./AnimatedSection";
import heroImage from "@/assets/hero-wedding.jpg";

const differentials = [
  { icon: Heart, title: "Atendimento Personalizado", desc: "Cada casal é único. Entendemos sua história para criar algo verdadeiramente especial." },
  { icon: Hash, title: "Número Limitado", desc: "Trabalhamos com poucos casamentos por ano para garantir atenção total a cada história." },
  { icon: Users, title: "Equipe Discreta", desc: "Profissionais experientes que capturam sem interferir nos momentos mais preciosos." },
  { icon: Camera, title: "Direção Sensível", desc: "Um olhar cinematográfico que valoriza a emoção real, sem poses forçadas." },
  { icon: Scissors, title: "Edição Artesanal", desc: "Cada filme é único. Nada de modelos prontos ou fórmulas repetitivas." },
];

const services = [
  {
    icon: Film,
    title: "Vídeo de Casamento",
    image: heroImage,
    features: ["Trailer cinematográfico", "Filme completo do casamento", "Captação de áudio dos votos e discursos"],
    label: "Filmes com narrativa, ritmo e emoção",
  },
  {
    icon: CameraIcon,
    title: "Fotografia de Casamento",
    image: heroImage,
    features: ["Registro espontâneo e natural", "Momentos autênticos e atemporais", "Edição artística premium"],
    label: "Estilo documental e artístico",
  },
];

const Differentials = () => (
  <>
    {/* Differentials */}
    <section className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4 md:px-6 max-w-5xl">
        <AnimatedSection className="text-center mb-12 md:mb-16">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-4">Por que nos escolher</p>
          <h2 className="font-heading text-3xl md:text-5xl font-light text-foreground">
            Muito além do registro
          </h2>
          <div className="w-12 h-[2px] bg-primary mx-auto mt-5" />
        </AnimatedSection>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6">
          {differentials.slice(0, 3).map((item, i) => (
            <AnimatedSection key={item.title} delay={i * 0.1}>
              <div className="bg-accent/50 border border-border rounded-lg p-5 md:p-6 text-center h-full hover:shadow-md transition-shadow">
                <div className="mx-auto w-11 h-11 flex items-center justify-center rounded-full bg-primary/10 mb-4">
                  <item.icon size={20} className="text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="font-heading text-base md:text-lg font-medium text-foreground mb-2">{item.title}</h3>
                <p className="font-body text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 md:gap-6 max-w-2xl mx-auto">
          {differentials.slice(3).map((item, i) => (
            <AnimatedSection key={item.title} delay={(i + 3) * 0.1}>
              <div className="bg-accent/50 border border-border rounded-lg p-5 md:p-6 text-center h-full hover:shadow-md transition-shadow">
                <div className="mx-auto w-11 h-11 flex items-center justify-center rounded-full bg-primary/10 mb-4">
                  <item.icon size={20} className="text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="font-heading text-base md:text-lg font-medium text-foreground mb-2">{item.title}</h3>
                <p className="font-body text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection className="text-center mt-12 md:mt-16">
          <p className="font-body text-xs md:text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
            A Racun Weddings é para quem valoriza histórias reais, emoção verdadeira e um olhar cinematográfico. Trabalhamos com número limitado de casamentos por ano para garantir atenção total a cada história.
          </p>
        </AnimatedSection>
      </div>
    </section>

    {/* Services */}
    <section className="py-20 md:py-28 bg-secondary/30">
      <div className="container mx-auto px-4 md:px-6 max-w-5xl">
        <AnimatedSection className="text-center mb-12 md:mb-16">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-4">Nossos Serviços</p>
          <h2 className="font-heading text-3xl md:text-5xl font-light text-foreground">
            Cada casamento é único
          </h2>
          <p className="font-body text-sm text-muted-foreground max-w-md mx-auto mt-3">
            Projetos personalizados que capturam a essência do seu grande dia
          </p>
          <div className="w-12 h-[2px] bg-primary mx-auto mt-5" />
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {services.map((service, i) => (
            <AnimatedSection key={service.title} delay={i * 0.15}>
              <div className="group">
                <div className="relative rounded-xl overflow-hidden aspect-[4/3] mb-5">
                  <img
                    src={service.image}
                    alt={service.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <service.icon size={16} className="text-primary-foreground" />
                    </div>
                    <span className="font-heading text-lg text-white font-medium">{service.title}</span>
                  </div>
                </div>
                <p className="font-body text-xs text-muted-foreground mb-3">{service.label}</p>
                <ul className="space-y-2">
                  {service.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 font-body text-sm text-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection className="text-center mt-16 md:mt-20 bg-card border border-border rounded-xl p-8 md:p-10 max-w-2xl mx-auto">
          <h3 className="font-heading text-xl md:text-2xl font-medium text-foreground mb-3">Projetos Personalizados</h3>
          <p className="font-body text-sm text-muted-foreground leading-relaxed">
            Cada casamento é tratado como único. Não trabalhamos com pacotes padronizados — criamos uma proposta exclusiva para contar a sua história.
          </p>
        </AnimatedSection>
      </div>
    </section>
  </>
);

export default Differentials;
