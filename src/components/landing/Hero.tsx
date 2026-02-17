import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getGeneralWhatsAppUrl } from "@/lib/whatsapp";
import heroImage from "@/assets/hero-wedding.jpg";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image - full coverage */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Casamento cinematográfico"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center max-w-4xl pt-20">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-body text-xs uppercase tracking-[0.35em] text-hero-foreground/70 mb-6"
        >
          Racun Weddings
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4 }}
          className="font-heading text-4xl md:text-6xl lg:text-7xl font-light text-hero-foreground leading-[1.1] mb-4"
        >
          Histórias reais.
          <br />
          <em className="text-primary font-light italic">Emoções eternas.</em>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.65 }}
          className="font-body text-sm md:text-base text-hero-foreground/70 max-w-2xl mx-auto mb-4 leading-relaxed"
        >
          Filmes e fotografias de casamento com narrativa cinematográfica,
          <br className="hidden md:block" />
          criados para casais que valorizam cada detalhe do seu grande dia.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="font-heading text-sm md:text-base text-hero-foreground/50 italic max-w-xl mx-auto mb-10"
        >
          "Para casais que não querem apenas registrar um casamento,
          <br className="hidden md:block" />
          mas reviver cada sentimento."
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.95 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Button variant="hero" size="lg" className="px-8 py-6 text-xs uppercase tracking-[0.15em]" asChild>
            <a href={getGeneralWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
              Quero conversar sobre meu casamento
            </a>
          </Button>
          <Button variant="hero-outline" size="lg" className="px-8 py-6 text-xs uppercase tracking-[0.15em]" asChild>
            <a href="#portfolio">
              Vamos contar sua história
            </a>
          </Button>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="font-body text-[10px] uppercase tracking-[0.25em] text-hero-foreground/50">Scroll</span>
        <div className="w-px h-10 bg-gradient-to-b from-hero-foreground/40 to-transparent" />
      </motion.div>
    </section>
  );
};

export default Hero;
