import { Link } from "react-router-dom";
import AnimatedSection from "@/components/landing/AnimatedSection";

const About = () => (
  <div className="min-h-screen bg-background">
    <header className="py-8 bg-hero">
      <div className="container mx-auto px-6">
        <Link to="/" className="font-heading text-2xl font-light tracking-wider text-hero-foreground">
          Racun <span className="font-semibold">Weddings</span>
        </Link>
      </div>
    </header>
    <main className="py-24">
      <div className="container mx-auto px-6 max-w-3xl">
        <AnimatedSection>
          <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-4 text-center">Sobre nós</p>
          <h1 className="font-heading text-4xl md:text-6xl font-light text-foreground mb-8 text-center">
            Racun Weddings
          </h1>
          <div className="font-body text-muted-foreground space-y-4 leading-relaxed text-center">
            <p>
              Nascemos da paixão por contar histórias reais com a linguagem do cinema. Cada casamento que filmamos e fotografamos é uma oportunidade de criar algo eterno.
            </p>
            <p>
              Acreditamos que as melhores memórias surgem quando a equipe é invisível e o casal está livre para viver intensamente. Por isso, limitamos o número de datas por ano — para dar a cada projeto o cuidado artesanal que ele merece.
            </p>
          </div>
        </AnimatedSection>
      </div>
    </main>
  </div>
);

export default About;
