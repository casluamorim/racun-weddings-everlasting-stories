import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { getGeneralWhatsAppUrl } from "@/lib/whatsapp";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Portfólio", href: "#portfolio" },
    { label: "Investimento", href: "#investimento" },
    { label: "Contato", href: "#contato" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-hero/95 backdrop-blur-md py-3 shadow-lg"
          : "bg-transparent py-6"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between px-6">
        <a href="/" className="font-heading text-2xl md:text-3xl font-light tracking-wider text-hero-foreground">
          Racun <span className="font-semibold">Weddings</span>
        </a>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="font-body text-xs uppercase tracking-[0.2em] text-hero-foreground/70 hover:text-primary transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href={getGeneralWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="font-body text-xs uppercase tracking-[0.2em] border border-primary/60 text-primary px-5 py-2 hover:bg-primary hover:text-primary-foreground transition-all"
          >
            Fale conosco
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-hero-foreground"
          aria-label="Menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-hero/98 backdrop-blur-md border-t border-hero-foreground/10 px-6 py-6 space-y-4">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="block font-body text-sm uppercase tracking-[0.15em] text-hero-foreground/80 hover:text-primary transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href={getGeneralWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="block font-body text-sm uppercase tracking-[0.15em] text-primary"
          >
            Fale conosco
          </a>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
