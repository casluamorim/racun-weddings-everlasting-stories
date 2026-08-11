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
    enabled: !!slug,
  });

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

          <h1 className="font-heading text-3xl md:text-5xl font-light text-foreground mb-6">{post.title}</h1>

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

          <div className="mt-14 rounded-lg border border-border bg-card p-8 text-center">
            <h2 className="font-heading text-2xl font-light text-foreground mb-3">
              Quer conversar sobre o seu casamento?
            </h2>
            <p className="font-body text-sm text-muted-foreground mb-6">
              Atendemos Blumenau, Florianópolis, Joinville, Balneário Camboriú e região.
            </p>
            <Button asChild>
              <Link to="/#contato">Solicitar orçamento</Link>
            </Button>
          </div>
        </article>
      </main>
    </div>
  );
};

export default BlogPost;
