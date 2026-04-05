import { Button } from "@/components/ui/button";
import { getGeneralWhatsAppUrl } from "@/lib/whatsapp";
import { Instagram, Mail, MessageCircle } from "lucide-react";
import AnimatedSection from "./AnimatedSection";
import { useSiteContent } from "@/hooks/useSiteContent";

const Footer = () => {
  const { getValue } = useSiteContent();

  const ctaTitle = getValue("cta", "title", "Seu casamento acontece em um dia.");
  const ctaTitleAccent = getValue("cta", "title_accent", "A memória fica para sempre.");
  const ctaButtonText = getValue("cta", "button_text", "Reservar minha data");
  const ctaButtonLink = getValue("cta", "button_link", "#contato");

  const brand = getValue("footer", "brand", "Racun Weddings");
  const tagline = getValue("footer", "tagline", "Filmes e fotografias de casamento");
  const instagramUrl = getValue("footer", "instagram_url", "https://instagram.com/racunweddings");
  const email = getValue("footer", "email", "racunagencia@gmail.com");

  return (
    <footer>
      {/* Final CTA */}
      <section className="py-24 md:py-32 bg-hero text-center">
        <div className="container mx-auto px-6 max-w-3xl">
          <AnimatedSection>
            <h2 className="font-heading text-3xl md:text-5xl lg:text-6xl font-light text-hero-foreground leading-tight mb-6">
              {ctaTitle}{" "}
              <em className="text-primary">{ctaTitleAccent}</em>
            </h2>
            <Button variant="hero" size="lg" className="px-12 py-6 mt-4" asChild>
              <a href={ctaButtonLink}>{ctaButtonText}</a>
            </Button>
          </AnimatedSection>
        </div>
      </section>

      {/* Footer bar */}
      <div className="bg-hero py-10 border-t border-hero-foreground/10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="font-heading text-xl text-hero-foreground font-light tracking-wider">
              {brand.includes(" ") ? (
                <>{brand.split(" ")[0]} <span className="font-semibold">{brand.split(" ").slice(1).join(" ")}</span></>
              ) : brand}
            </p>
            <p className="font-body text-xs text-hero-foreground/40 mt-1">{tagline}</p>
          </div>

          <div className="flex items-center gap-6">
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="text-hero-foreground/50 hover:text-primary transition-colors" aria-label="Instagram">
              <Instagram size={20} />
            </a>
            <a href={getGeneralWhatsAppUrl()} target="_blank" rel="noopener noreferrer" className="text-hero-foreground/50 hover:text-primary transition-colors" aria-label="WhatsApp">
              <MessageCircle size={20} />
            </a>
            <a href={`mailto:${email}`} className="text-hero-foreground/50 hover:text-primary transition-colors" aria-label="E-mail">
              <Mail size={20} />
            </a>
          </div>

          <div className="flex gap-6 font-body text-[10px] uppercase tracking-[0.15em] text-hero-foreground/40">
            <a href="/historias" className="hover:text-primary transition-colors">Histórias</a>
            <a href="/blog" className="hover:text-primary transition-colors">Blog</a>
            <a href="/sobre" className="hover:text-primary transition-colors">Sobre</a>
            <a href="/admin" className="hover:text-primary transition-colors">Admin</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
