import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock } from "lucide-react";
import { getReadingMinutes, trackBlogEvent, trackScrollDepth } from "@/lib/blogAnalytics";
import { getGeneralWhatsAppUrl } from "@/lib/whatsapp";

const SITE_URL = "https://weddings.agenciaracun.com";

const CATEGORY_LABELS: Record<string, string> = {
  geral: "Geral",
  fotografia: "Fotografia",
  video: "Vídeo",
  locais: "Locais",
  planejamento: "Planejamento",
  entrega: "Entrega",
  tendencias: "Tendências",
};


const renderContent = (content: string) => {
  const blocks: JSX.Element[] = [];
  const lines = content.split("\n");
  let list: string[] = [];

  const flushList = (key: string) => {
    if (!list.length) return;
    blocks.push(
      <ul key={key} className="mb-6 list-disc space-y-2 pl-5 font-body text-muted-foreground">
        {list.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    );
    list = [];
  };

  lines.forEach((raw, index) => {
    const line = raw.trim();
    if (line.startsWith("- ")) {
      list.push(line.slice(2));
      return;
    }
    flushList(`list-${index}`);
    if (!line) return;
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={index} className="font-heading text-2xl font-light text-foreground mt-10 mb-4">
          {line.slice(3)}
        </h2>
      );
      return;
    }
    blocks.push(
      <p key={index} className="mb-5 font-body leading-relaxed text-muted-foreground">
        {line}
      </p>
    );
  });
  flushList("list-end");
  return blocks;
};

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug!)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: related } = useQuery({
    queryKey: ["blog-related", post?.id, post?.category],
    queryFn: async () => {
      const tags = post?.tags ?? [];
      const filters = [`category.eq.${post!.category}`];
      if (tags.length) filters.push(`tags.ov.{${tags.map((t) => `"${t}"`).join(",")}}`);
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id,title,slug,excerpt,cover_image_url,content,category")
        .eq("is_published", true)
        .neq("id", post!.id)
        .or(filters.join(","))
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!post?.id,
  });

  const readingMinutes = getReadingMinutes(post?.content);

  useEffect(() => {
    if (!post?.slug) return;
    void trackBlogEvent("pageview", { postSlug: post.slug });
    return trackScrollDepth(post.slug);
  }, [post?.slug]);



  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-24">
        <div className="container mx-auto max-w-3xl space-y-4 px-6">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="aspect-video w-full rounded-lg" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-heading text-3xl font-light text-foreground">Artigo não encontrado</h1>
        <Button asChild variant="outline">
          <Link to="/blog">Voltar para o blog</Link>
        </Button>
      </div>
    );
  }

  const url = `${SITE_URL}/blog/${post.slug}`;
  const description = post.seo_description || post.excerpt || "Blog Racun Weddings";

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{(post.seo_title || post.title).slice(0, 60)}</title>
        <meta name="description" content={description.slice(0, 158)} />
        <link rel="canonical" href={url} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.seo_title || post.title} />
        <meta property="og:description" content={description.slice(0, 158)} />
        <meta property="og:url" content={url} />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description,
            image: post.cover_image_url || undefined,
            datePublished: post.published_at || post.created_at,
            dateModified: post.updated_at,
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
            author: { "@type": "Organization", name: "Racun Weddings" },
            publisher: { "@type": "Organization", name: "Racun Weddings" },
          })}
        </script>
      </Helmet>

      <header className="py-8 bg-hero">
        <div className="container mx-auto px-6">
          <Link to="/" className="font-heading text-2xl font-light tracking-wider text-hero-foreground">
            Racun <span className="font-semibold">Weddings</span>
          </Link>
        </div>
      </header>

      <main className="py-16">
        <article className="container mx-auto max-w-3xl px-6">
          <Link
            to="/blog"
            className="mb-8 inline-flex items-center gap-2 font-body text-sm text-muted-foreground hover:text-primary"
          >
            <ArrowLeft size={16} /> Todos os artigos
          </Link>

          <h1 className="font-heading text-3xl md:text-5xl font-light text-foreground mb-4">{post.title}</h1>

          <div className="mb-8 flex flex-wrap items-center gap-3 font-body text-xs uppercase tracking-widest text-primary">
            <span>{CATEGORY_LABELS[post.category] ?? post.category}</span>
            <span className="inline-flex items-center gap-1 normal-case tracking-normal text-muted-foreground">
              <Clock size={14} /> {readingMinutes} min de leitura
            </span>
          </div>

          {post.cover_image_url && (
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="mb-10 aspect-video w-full rounded-lg object-cover"
              loading="lazy"
              decoding="async"
            />
          )}

          {post.content ? renderContent(post.content) : null}

          {!!post.tags?.length && (
            <div className="mt-10 flex flex-wrap gap-2">
              {post.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-border px-3 py-1 font-body text-xs capitalize text-muted-foreground"
                >
                  #{t}
                </span>
              ))}
            </div>
          )}

          <div className="mt-14 rounded-lg border border-border bg-card p-8 text-center">
            <h2 className="font-heading text-2xl font-light text-foreground mb-3">
              Quer conversar sobre o seu casamento?
            </h2>
            <p className="font-body text-sm text-muted-foreground mb-6">
              Atendemos Blumenau, Florianópolis, Joinville, Balneário Camboriú e região.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild>
                <Link to="/#contato" onClick={() => void trackBlogEvent("cta_click", { postSlug: post.slug })}>
                  Solicitar orçamento
                </Link>
              </Button>
              <Button asChild variant="outline">
                <a
                  href={getGeneralWhatsAppUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => void trackBlogEvent("whatsapp_cta", { postSlug: post.slug })}
                >
                  Falar no WhatsApp
                </a>
              </Button>
            </div>
          </div>

          {!!related?.length && (
            <section className="mt-16">
              <h2 className="font-heading text-2xl font-light text-foreground mb-6">Posts relacionados</h2>
              <div className="grid gap-6 sm:grid-cols-3">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    to={`/blog/${r.slug}`}
                    className="group block rounded-lg border border-border bg-card overflow-hidden transition-colors hover:border-primary/50"
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-muted">
                      {r.cover_image_url ? (
                        <img
                          src={r.cover_image_url}
                          alt={r.title}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center font-heading text-xs text-muted-foreground">
                          Racun Weddings
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="mb-1 font-body text-[11px] uppercase tracking-widest text-muted-foreground">
                        {getReadingMinutes(r.content)} min de leitura
                      </p>
                      <h3 className="font-heading text-base font-light text-foreground group-hover:text-primary transition-colors">
                        {r.title}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

        </article>
      </main>
    </div>
  );
};

export default BlogPost;
