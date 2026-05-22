import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import AnimatedSection from "@/components/landing/AnimatedSection";
import PortfolioCTA from "@/components/landing/PortfolioCTA";
import { Skeleton } from "@/components/ui/skeleton";

const SITE_URL = "https://weddings.agenciaracun.com";

const PortfolioPage = () => {
  const { data: weddings, isLoading } = useQuery({
    queryKey: ["portfolio-weddings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weddings")
        .select("id, slug, couple_names, city, venue, date, cover_photo_url")
        .eq("is_published", true)
        .order("date", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const itemListJsonLd = weddings && weddings.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: weddings.map((w, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: `${SITE_URL}/portfolio/${w.slug}`,
          name: w.couple_names,
        })),
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Portfólio de Casamentos | Racun Weddings</title>
        <meta
          name="description"
          content="Conheça os casamentos que cobrimos com filme, fotografia e storymaker. Cobertura completa em Florianópolis, Blumenau, Balneário Camboriú e Joinville."
        />
        <link rel="canonical" href={`${SITE_URL}/portfolio`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Portfólio de Casamentos | Racun Weddings" />
        <meta
          property="og:description"
          content="Cada história tem seu capítulo. Veja casamentos reais filmados pela Racun Weddings."
        />
        <meta property="og:url" content={`${SITE_URL}/portfolio`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Portfólio de Casamentos | Racun Weddings" />
        {itemListJsonLd && (
          <script type="application/ld+json">{JSON.stringify(itemListJsonLd)}</script>
        )}
      </Helmet>

      <Navbar />
      <main className="pt-32 pb-24">
        <div className="container mx-auto px-6 max-w-6xl">
          <AnimatedSection className="text-center mb-16">
            <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-4">Portfólio</p>
            <h1 className="font-heading text-4xl md:text-6xl font-light text-foreground mb-4">
              Casamentos que filmamos
            </h1>
            <p className="font-body text-muted-foreground">
              Cada história tem seu próprio capítulo. Explore os casais que confiaram em nós.
            </p>
          </AnimatedSection>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-label="Carregando portfólio">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-sm overflow-hidden border border-border">
                  <Skeleton className="aspect-[4/5] w-full" />
                  <div className="p-5 space-y-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : !weddings || weddings.length === 0 ? (
            <p className="text-center font-body text-muted-foreground">Em breve, novas histórias aqui.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {weddings.map((w, idx) => (
                <Link
                  key={w.id}
                  to={`/portfolio/${w.slug}`}
                  className="group block overflow-hidden rounded-sm bg-card border border-border hover:border-primary/40 transition-all"
                >
                  <div className="aspect-[4/5] overflow-hidden bg-muted">
                    {w.cover_photo_url ? (
                      <img
                        src={w.cover_photo_url}
                        alt={`Casamento de ${w.couple_names}`}
                        loading={idx < 3 ? "eager" : "lazy"}
                        decoding="async"
                        fetchPriority={idx === 0 ? "high" : "auto"}
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground font-body text-xs">
                        Sem capa
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h2 className="font-heading text-xl text-foreground mb-1">{w.couple_names}</h2>
                    <p className="font-body text-xs text-muted-foreground uppercase tracking-[0.15em]">
                      {[w.city, w.venue].filter(Boolean).join(" • ")}
                      {w.date && ` • ${new Date(w.date).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <PortfolioCTA />
      <Footer />
    </div>
  );
};

export default PortfolioPage;
