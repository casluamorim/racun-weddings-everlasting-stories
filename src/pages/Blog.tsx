import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import AnimatedSection from "@/components/landing/AnimatedSection";

const SITE_URL = "https://weddings.agenciaracun.com";

const Blog = () => (
  <div className="min-h-screen bg-background">
    <Helmet>
      <title>Blog Racun Weddings — Dicas para Casamentos em SC</title>
      <meta
        name="description"
        content="Dicas, inspirações e bastidores sobre filme e fotografia de casamento em Santa Catarina. Acompanhe o blog da Racun Weddings."
      />
      <link rel="canonical" href={`${SITE_URL}/blog`} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Blog Racun Weddings" />
      <meta property="og:description" content="Dicas e inspirações para o seu casamento." />
      <meta property="og:url" content={`${SITE_URL}/blog`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Blog Racun Weddings" />
      <meta name="twitter:description" content="Dicas e inspirações para o seu casamento." />
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
          <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-4">Blog</p>
          <h1 className="font-heading text-4xl md:text-6xl font-light text-foreground mb-6">
            Dicas e inspirações para o seu casamento
          </h1>
          <p className="font-body text-muted-foreground">Em breve, novos artigos serão publicados aqui.</p>
        </AnimatedSection>
      </div>
    </main>
  </div>
);

export default Blog;
