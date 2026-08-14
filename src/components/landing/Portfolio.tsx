import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Play, X, ArrowRight } from "lucide-react";
import AnimatedSection from "./AnimatedSection";

type FeedItem = {
  id: string;
  kind: "photo" | "video";
  category: "wedding" | "pre_wedding";
  city: string | null;
  couple: string | null;
  label: string | null;
  src: string;
  ytId?: string;
  order: number;
};

const feedAlt = (item: FeedItem) => {
  if (item.label) return item.label;
  const tipo =
    item.kind === "video"
      ? item.category === "pre_wedding"
        ? "Filme de ensaio pré-wedding"
        : "Filme de casamento"
      : item.category === "pre_wedding"
        ? "Ensaio pré-wedding"
        : "Fotografia de casamento";
  const quem = item.couple ? ` de ${item.couple}` : "";
  const onde = item.city ? ` em ${item.city}` : "";
  return `${tipo}${quem}${onde}`;
};


const PAGE_SIZE = 9;

const extractYoutubeId = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|v=|\/embed\/)([\w-]{11})/);
  return match?.[1] ?? "";
};

const Portfolio = () => {
  const [activeVideo, setActiveVideo] = useState<string | null>(null);
  const [filterCity, setFilterCity] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const { data: featuredWeddings } = useQuery({
    queryKey: ["featured-home-weddings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weddings")
        .select("id, slug, couple_names, city, venue, date, cover_photo_url")
        .eq("is_published", true)
        .eq("is_featured_home", true)
        .order("date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(9);
      if (error) throw error;
      return data;
    },
  });

  // Curadoria da página inicial (painel > Página Inicial)
  const { data: homePhotos } = useQuery({
    queryKey: ["home-feed", "photos"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("portfolio_photos") as any)
        .select("id, photo_url, caption, category, home_sort_order, weddings(city)")
        .eq("show_in_home", true)
        .order("home_sort_order", { ascending: true })
        .limit(120);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: homeVideos } = useQuery({
    queryKey: ["home-feed", "videos"],
    queryFn: async () => {
      const { data, error } = await (supabase.from("portfolio_videos") as any)
        .select("id, title, youtube_url, category, home_sort_order, weddings(city)")
        .eq("show_in_home", true)
        .order("home_sort_order", { ascending: true })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: standalonePhotos } = useQuery({
    queryKey: ["public-standalone-photos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_photos")
        .select("id, photo_url, caption, sort_order")
        .is("wedding_id", null)
        .eq("show_in_portfolio", true)
        .order("sort_order")
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  const { data: videos } = useQuery({
    queryKey: ["public-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_videos")
        .select("id, title, youtube_url, is_featured")
        .eq("show_in_portfolio", true)
        .order("sort_order")
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [
      ...((homePhotos ?? []) as any[]).map((p) => ({
        id: `photo-${p.id}`,
        kind: "photo" as const,
        category: (p.category ?? "wedding") as FeedItem["category"],
        city: p.weddings?.city ?? null,
        label: p.caption ?? null,
        src: p.photo_url,
        order: p.home_sort_order ?? 0,
      })),
      ...((homeVideos ?? []) as any[]).map((v) => {
        const ytId = extractYoutubeId(v.youtube_url);
        return {
          id: `video-${v.id}`,
          kind: "video" as const,
          category: (v.category ?? "wedding") as FeedItem["category"],
          city: v.weddings?.city ?? null,
          label: v.title ?? null,
          src: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
          ytId,
          order: v.home_sort_order ?? 0,
        };
      }),
    ];
    return items.sort((a, b) => a.order - b.order);
  }, [homePhotos, homeVideos]);

  const cities = useMemo(
    () => Array.from(new Set(feed.map((i) => i.city).filter(Boolean))) as string[],
    [feed]
  );

  const filteredFeed = useMemo(
    () =>
      feed.filter((i) => {
        if (filterCity !== "all" && (i.city ?? "") !== filterCity) return false;
        if (filterCategory !== "all" && i.category !== filterCategory) return false;
        return true;
      }),
    [feed, filterCity, filterCategory]
  );

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [filterCity, filterCategory]);

  // Carregamento infinito
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible((v) => (v < filteredFeed.length ? v + PAGE_SIZE : v));
        }
      },
      { rootMargin: "300px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [filteredFeed.length]);

  const displayWeddings = featuredWeddings && featuredWeddings.length > 0 ? featuredWeddings : null;
  const hasFeed = filteredFeed.length > 0;
  const fallbackVideos = !feed.length && videos && videos.length > 0 ? videos : null;
  const fallbackPhotos =
    !feed.length && standalonePhotos && standalonePhotos.length > 0 ? standalonePhotos : null;

  const videoJsonLd = homeVideos?.length
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        itemListElement: (homeVideos as any[]).map((v, i) => {
          const ytId = extractYoutubeId(v.youtube_url);
          return {
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "VideoObject",
              name: v.title || "Filme de casamento – Racun Weddings",
              description: `Filme cinematográfico de casamento produzido por Racun Weddings.${v.title ? ` ${v.title}.` : ""}`,
              thumbnailUrl: `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`,
              uploadDate: new Date().toISOString().split("T")[0],
              contentUrl: v.youtube_url,
              embedUrl: `https://www.youtube.com/embed/${ytId}`,
              publisher: {
                "@type": "Organization",
                name: "Racun Weddings",
                url: "https://weddings.agenciaracun.com",
              },
            },
          };
        }),
      }
    : null;

  const chip = (active: boolean) =>
    `px-4 py-1.5 rounded-full font-body text-[11px] uppercase tracking-[0.15em] transition-colors border ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "border-section-dark-foreground/20 text-section-dark-foreground/70 hover:border-primary/50"
    }`;

  return (
    <section id="portfolio" className="py-24 md:py-32 bg-section-dark">
      {videoJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(videoJsonLd) }}
        />
      )}
      <div className="container mx-auto px-6 max-w-6xl">
        <AnimatedSection className="text-center mb-16">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-4">Portfólio</p>
          <h2 className="font-heading text-3xl md:text-5xl font-light text-section-dark-foreground">
            Histórias que nos emocionam
          </h2>
        </AnimatedSection>

        {/* Featured weddings */}
        {displayWeddings && (
          <AnimatedSection className="mb-20">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayWeddings.map((w) => (
                <Link
                  key={w.id}
                  to={`/casamentos/${w.slug}`}
                  className="group block overflow-hidden rounded-sm bg-card/5 border border-section-dark-foreground/10 hover:border-primary/40 transition-all"
                >
                  <div className="aspect-[4/5] overflow-hidden bg-section-dark-foreground/5">
                    {w.cover_photo_url ? (
                      <img
                        src={w.cover_photo_url}
                        alt={`Casamento de ${w.couple_names}`}
                        loading="lazy"
                        decoding="async"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-section-dark-foreground/40 font-body text-xs">
                        Sem capa
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-heading text-xl text-section-dark-foreground mb-1">{w.couple_names}</h3>
                    <p className="font-body text-xs text-section-dark-foreground/60 uppercase tracking-[0.15em]">
                      {[w.city, w.venue].filter(Boolean).join(" • ")}
                      {w.date && ` • ${new Date(w.date).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                to="/portfolio"
                className="inline-flex items-center gap-2 font-body text-xs uppercase tracking-[0.3em] text-primary hover:text-primary/80 transition-colors"
              >
                Ver portfólio completo <ArrowRight size={14} />
              </Link>
            </div>
          </AnimatedSection>
        )}

        {/* Feed curado — mobile first, estilo rede social */}
        {feed.length > 0 && (
          <AnimatedSection>
            <h3 className="font-heading text-xl text-section-dark-foreground/80 mb-5 text-center">Destaques</h3>

            {/* Filtros */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
              <button className={chip(filterCategory === "all")} onClick={() => setFilterCategory("all")}>
                Tudo
              </button>
              <button className={chip(filterCategory === "wedding")} onClick={() => setFilterCategory("wedding")}>
                Casamento
              </button>
              <button
                className={chip(filterCategory === "pre_wedding")}
                onClick={() => setFilterCategory("pre_wedding")}
              >
                Pré-Wedding
              </button>
              {cities.length > 1 && (
                <select
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="px-3 py-1.5 rounded-full bg-transparent border border-section-dark-foreground/20 font-body text-[11px] uppercase tracking-[0.15em] text-section-dark-foreground/70"
                >
                  <option value="all">Todas as cidades</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {hasFeed ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2 md:gap-3 -mx-6 sm:mx-0">
                  {filteredFeed.slice(0, visible).map((item) => (
                    <div
                      key={item.id}
                      className={`relative aspect-square overflow-hidden bg-section-dark-foreground/5 ${
                        item.kind === "video" ? "cursor-pointer group" : ""
                      }`}
                      onClick={() => item.kind === "video" && item.ytId && setActiveVideo(item.ytId)}
                    >
                      <img
                        src={item.src}
                        alt={item.label || (item.kind === "video" ? "Filme de casamento" : "Fotografia de casamento")}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                        loading="lazy"
                        decoding="async"
                        sizes="(max-width: 640px) 50vw, 33vw"
                      />
                      {item.kind === "video" && (
                        <div className="absolute inset-0 bg-hero/40 group-hover:bg-hero/20 transition-colors flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full border-2 border-primary-foreground/80 flex items-center justify-center">
                            <Play size={16} className="text-primary-foreground ml-0.5" fill="currentColor" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div ref={sentinelRef} className="h-10" />
                {visible < filteredFeed.length && (
                  <div className="text-center">
                    <button
                      onClick={() => setVisible((v) => v + PAGE_SIZE)}
                      className="font-body text-xs uppercase tracking-[0.3em] text-primary hover:text-primary/80"
                    >
                      Carregar mais
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="font-body text-sm text-section-dark-foreground/50 text-center">
                Nada por aqui com esse filtro.
              </p>
            )}
          </AnimatedSection>
        )}

        {/* Fallback: sem curadoria definida no painel */}
        {fallbackVideos && (
          <AnimatedSection className="mb-20">
            <h3 className="font-heading text-xl text-section-dark-foreground/80 mb-8 text-center">Filmes</h3>
            <div className="grid md:grid-cols-3 gap-6">
              {fallbackVideos.map((v) => {
                const ytId = extractYoutubeId(v.youtube_url);
                return (
                  <div
                    key={v.id}
                    className="group cursor-pointer relative aspect-video overflow-hidden rounded-sm"
                    onClick={() => setActiveVideo(ytId)}
                  >
                    <img
                      src={`https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`}
                      alt={v.title || "Vídeo de casamento"}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-hero/40 group-hover:bg-hero/20 transition-colors flex items-center justify-center">
                      <div className="w-14 h-14 rounded-full border-2 border-primary-foreground/80 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play size={20} className="text-primary-foreground ml-1" fill="currentColor" />
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-hero/80 to-transparent">
                      <p className="font-heading text-sm text-hero-foreground">{v.title}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </AnimatedSection>
        )}

        {fallbackPhotos && (
          <AnimatedSection>
            <h3 className="font-heading text-xl text-section-dark-foreground/80 mb-6 md:mb-8 text-center">Fotografias</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2 md:gap-3 -mx-6 sm:mx-0">
              {fallbackPhotos.map((p) => (
                <div key={p.id} className="relative aspect-square overflow-hidden bg-section-dark-foreground/5">
                  <img
                    src={p.photo_url}
                    alt={p.caption || "Fotografia de casamento"}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    loading="lazy"
                    decoding="async"
                    sizes="(max-width: 640px) 50vw, 33vw"
                  />
                </div>
              ))}
            </div>
          </AnimatedSection>
        )}

        {!displayWeddings && !feed.length && !fallbackVideos && !fallbackPhotos && (
          <p className="font-body text-sm text-section-dark-foreground/50 text-center">
            Em breve, novas histórias aqui.
          </p>
        )}
      </div>

      {/* Video modal */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 bg-hero/90 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setActiveVideo(null)}
        >
          <button
            className="absolute top-6 right-6 text-hero-foreground/80 hover:text-hero-foreground"
            onClick={() => setActiveVideo(null)}
          >
            <X size={32} />
          </button>
          <div className="w-full max-w-4xl aspect-video" onClick={(e) => e.stopPropagation()}>
            <iframe
              src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`}
              className="w-full h-full rounded-sm"
              allow="autoplay; fullscreen"
              allowFullScreen
              title="Vídeo de casamento"
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default Portfolio;
