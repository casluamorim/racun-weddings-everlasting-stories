import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import AnimatedSection from "@/components/landing/AnimatedSection";

const SITE_URL = "https://weddings.agenciaracun.com";

const Stories = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>Histórias de Casamento — Racun Weddings</title>
      <meta
        name="description"
        content="Histórias reais de casais que confiaram à Racun Weddings o registro cinematográfico do seu casamento em Santa Catarina."
      />
      <link rel="canonical" href={`${SITE_URL}/historias`} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Histórias de Casamento — Racun Weddings" />
      <meta property="og:description" content="Cada casamento, uma história única." />
      <meta property="og:url" content={`${SITE_URL}/historias`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Histórias de Casamento — Racun Weddings" />
      <meta name="twitter:description" content="Cada casamento, uma história única." />
    </Helmet>
    <header className="py-8 bg-hero">
      <div className="container mx-auto px-6">
        <Link to="/" className="font-heading text-2xl font-light tracking-wider text-hero-foreground">
          Racun <span className="font-semibold">Weddings</span>
        </Link>
      </div>
    </header>
    <main className="py-24">
      <div className="container mx-auto px-6 max-w-4xl text-center">
        <AnimatedSection>
          <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-4">Histórias</p>
          <h1 className="font-heading text-4xl md:text-6xl font-light text-foreground mb-6">
            Cada casamento, uma história única
          </h1>
          <p className="font-body text-muted-foreground">Em breve, novas histórias serão publicadas aqui.</p>
        </AnimatedSection>
      </div>
    </main>
  </div>
);

export default Stories;
