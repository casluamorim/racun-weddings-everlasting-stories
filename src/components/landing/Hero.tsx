import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getGeneralWhatsAppUrl } from "@/lib/whatsapp";
import heroImage from "@/assets/hero-wedding.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-hero">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Casamento cinematográfico"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-hero via-hero/40 to-hero/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center max-w-4xl">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-8"
        >
          Filmes &amp; Fotografias de Casamento
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4 }}
          className="font-heading text-4xl md:text-6xl lg:text-7xl font-light text-hero-foreground leading-[1.1] mb-8"
        >
          Para casais que não querem apenas registrar um casamento, mas{" "}
          <em className="text-primary font-light">reviver cada sentimento</em>.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="font-body text-sm md:text-base text-hero-foreground/60 max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          Atendemos um número limitado de casamentos por ano para garantir atenção total a cada história.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button variant="hero" size="lg" className="px-10 py-6" asChild>
            <a href={getGeneralWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
              Quero conversar sobre meu casamento
            </a>
          </Button>
          <Button variant="hero-outline" size="lg" className="px-10 py-6" asChild>
            <a href="#portfolio">
              Ver filmes e histórias
            </a>
          </Button>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="w-px h-16 bg-gradient-to-b from-transparent via-hero-foreground/30 to-transparent" />
      </motion.div>
    </section>
  );
};

export default Hero;
