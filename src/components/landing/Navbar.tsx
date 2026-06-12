import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // On non-home pages there is no dark hero behind the navbar, so always render solid.
  const solid = !isHome || scrolled;

  const links = [
    { label: "Serviços", href: "/#servicos", internal: false },
    { label: "Portfólio", href: "/portfolio", internal: true },
    { label: "Valores", href: "/#investimento", internal: false },
    { label: "Sobre", href: "/sobre", internal: true },
    { label: "FAQ", href: "/#faq", internal: false },
    { label: "Contato", href: "/#contato", internal: false },
  ];

  const renderLink = (l: typeof links[number], extraClass: string, onClick?: () => void) =>
    l.internal ? (
      <Link key={l.href} to={l.href} onClick={onClick} className={extraClass}>
        {l.label}
      </Link>
    ) : (
      <a key={l.href} href={l.href} onClick={onClick} className={extraClass}>
        {l.label}
      </a>
    );

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        solid
          ? "bg-hero/95 backdrop-blur-md py-3 shadow-lg"
          : "bg-transparent py-5"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between px-6">
        <Link to="/" className="font-heading text-xl md:text-2xl font-light tracking-wider text-hero-foreground">
          Racun Weddings
        </Link>

        {/* Desktop */}
        <div className="hidden lg:flex items-center gap-6">
          {links.map((l) =>
            renderLink(
              l,
              "font-body text-[11px] uppercase tracking-[0.18em] text-hero-foreground/80 hover:text-hero-foreground transition-colors"
            )
          )}
          <a
            href="/#investimento"
            className="font-body text-[11px] uppercase tracking-[0.18em] border border-hero-foreground/50 text-hero-foreground px-5 py-2.5 hover:bg-hero-foreground hover:text-hero transition-all ml-2"
          >
            Investimento
          </a>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden text-hero-foreground"
          aria-label="Menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-hero/98 backdrop-blur-md border-t border-hero-foreground/10 px-6 py-6 space-y-4">
          {links.map((l) =>
            renderLink(
              l,
              "block font-body text-sm uppercase tracking-[0.15em] text-hero-foreground/80 hover:text-hero-foreground transition-colors",
              () => setOpen(false)
            )
          )}
          <a
            href="/#investimento"
            onClick={() => setOpen(false)}
            className="block font-body text-sm uppercase tracking-[0.15em] text-hero-foreground border border-hero-foreground/50 px-4 py-2 w-fit"
          >
            Investimento
          </a>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
