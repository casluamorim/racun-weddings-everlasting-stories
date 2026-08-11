import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AnimatedSection from "@/components/landing/AnimatedSection";
import { Skeleton } from "@/components/ui/skeleton";

const SITE_URL = "https://weddings.agenciaracun.com";

const Blog = () => {
  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id,title,slug,excerpt,cover_image_url,published_at,created_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
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

      <main className="py-20">
        <div className="container mx-auto px-6 max-w-6xl">
          <AnimatedSection>
            <div className="text-center mb-14">
              <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-4">Blog</p>
              <h1 className="font-heading text-4xl md:text-6xl font-light text-foreground mb-4">
                Dicas e inspirações para o seu casamento
              </h1>
              <p className="font-body text-muted-foreground max-w-2xl mx-auto">
                Conteúdos sobre fotografia, filme, planejamento e locais em Santa Catarina.
              </p>
            </div>
          </AnimatedSection>

          {isLoading ? (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-[4/3] w-full rounded-lg" />
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : !posts?.length ? (
            <p className="text-center font-body text-muted-foreground">Em breve, novos artigos serão publicados aqui.</p>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <AnimatedSection key={post.id}>
                  <Link
                    to={`/blog/${post.slug}`}
                    className="group block h-full rounded-lg border border-border bg-card overflow-hidden transition-colors hover:border-primary/50"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-muted">
                      {post.cover_image_url ? (
                        <img
                          src={post.cover_image_url}
                          alt={post.title}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center font-heading text-sm text-muted-foreground">
                          Racun Weddings
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <h2 className="font-heading text-xl font-light text-foreground mb-2 group-hover:text-primary transition-colors">
                        {post.title}
                      </h2>
                      {post.excerpt && (
                        <p className="font-body text-sm text-muted-foreground line-clamp-3">{post.excerpt}</p>
                      )}
                    </div>
                  </Link>
                </AnimatedSection>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Blog;
