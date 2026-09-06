import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Play, X, Check, CalendarClock } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import AnimatedSection from "@/components/landing/AnimatedSection";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getWhatsAppUrl } from "@/lib/whatsapp";

const SITE_URL = "https://weddings.agenciaracun.com";

const extractYoutubeId = (url: string) =>
  url.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([\w-]{11})/)?.[1] ?? "";

type ProposalItem = {
  name?: string;
  price?: string;
  description?: string;
  features?: string[];
};

type ProposalMedia = { photos?: string[]; videos?: string[] };

const formatDate = (d?: string | null) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR") : "";

const formatLongDate = (d?: string | null) =>
  d
    ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

const formatTime = (t?: string | null) => (t ? t.slice(0, 5) : "");

const Proposal = () => {
  const { slug } = useParams<{ slug: string }>();
  const [activeVideo, setActiveVideo] = useState<string | null>(null);

  const { data: proposal, isLoading } = useQuery({
    queryKey: ["proposal", slug],
    enabled: !!slug,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("slug", slug!)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const expired = useMemo(() => {
    if (!proposal?.valid_until) return false;
    return new Date(`${proposal.valid_until}T23:59:59`) < new Date();
  }, [proposal]);

  const media = (proposal?.media ?? {}) as ProposalMedia;
  const items = (Array.isArray(proposal?.items) ? proposal?.items : []) as ProposalItem[];

  const { data: selectedMedia } = useQuery({
    queryKey: ["proposal-media", proposal?.id],
    enabled: !!proposal && !expired,
    queryFn: async () => {
      const photoIds = media.photos ?? [];
      const videoIds = media.videos ?? [];
      const [photos, videos] = await Promise.all([
        photoIds.length
          ? supabase.from("portfolio_photos").select("id, photo_url, caption").in("id", photoIds)
          : Promise.resolve({ data: [] as any[] }),
        videoIds.length
          ? supabase.from("portfolio_videos").select("id, youtube_url, title").in("id", videoIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      return { photos: photos.data ?? [], videos: videos.data ?? [] };
    },
  });

  useEffect(() => {
    if (proposal?.slug) void supabase.rpc("increment_proposal_view", { _slug: proposal.slug });
  }, [proposal?.slug]);

  const total = useMemo(() => {
    const sum = items.reduce((acc, i) => {
      const n = Number(String(i.price ?? "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
      return acc + (Number.isFinite(n) ? n : 0);
    }, 0);
    const discount = Number(proposal?.discount ?? 0);
    return { sum, discount, final: Math.max(0, sum - discount) };
  }, [items, proposal?.discount]);

  const brl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 pt-32 space-y-4">
          <Skeleton className="h-12 w-2/3" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!proposal || expired) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-4 pt-32 pb-20 text-center">
          <div>
            <CalendarClock className="mx-auto mb-4 text-primary" size={40} />
            <h1 className="font-heading text-3xl text-foreground mb-3">Orçamento indisponível</h1>
            <p className="font-body text-muted-foreground mb-6 max-w-md">
              Este orçamento não está mais disponível ou expirou. Fale com a gente que preparamos uma
              nova proposta para o seu casamento.
            </p>
            <Button asChild>
              <a href={getWhatsAppUrl("Olá! Gostaria de um novo orçamento para o meu casamento.")}>
                Falar no WhatsApp
              </a>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const title = `Orçamento ${proposal.couple_names} | Racun Weddings`;
  const description = `Proposta personalizada de fotografia e filmagem para o casamento de ${proposal.couple_names}.`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href={`${SITE_URL}/orcamento/${proposal.slug}`} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <Navbar />

      <main>
        <section className="pt-32 pb-12 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-4">
              Racun Weddings · Proposta personalizada
            </p>
            <h1 className="font-heading text-4xl md:text-6xl text-foreground mb-4">
              {proposal.couple_names}
            </h1>
            <p className="font-body text-sm text-muted-foreground">
              {[proposal.venue, proposal.city].filter(Boolean).join(" • ")}
            </p>
            {(proposal.event_date || (proposal as any).event_time) && (
              <span className="inline-block mt-6 rounded-full border border-border px-6 py-2 font-body text-sm text-foreground">
                {[
                  proposal.event_date ? `Cerimônia em ${formatLongDate(proposal.event_date)}` : "",
                  formatTime((proposal as any).event_time)
                    ? `às ${formatTime((proposal as any).event_time)}`
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              </span>
            )}
            {proposal.intro && (
              <p className="font-body text-base text-muted-foreground mt-6 max-w-2xl mx-auto whitespace-pre-line">
                {proposal.intro}
              </p>
            )}
          </div>
        </section>

        {items.length > 0 && (
          <AnimatedSection>
            <section className="py-12 px-4">
              <div className="container mx-auto max-w-5xl">
                <h2 className="font-heading text-2xl md:text-3xl text-foreground text-center mb-8">
                  Pacotes sugeridos
                </h2>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className="bg-card border border-border rounded-xl p-6 flex flex-col"
                    >
                      <h3 className="font-heading text-2xl text-foreground mb-1">{item.name}</h3>
                      {item.description && (
                        <p className="font-body text-sm text-muted-foreground mb-4 whitespace-pre-line">
                          {item.description}
                        </p>
                      )}
                      {item.price && (
                        <p className="font-heading text-3xl text-primary mb-1">{item.price}</p>
                      )}
                      <div className="h-px bg-border my-5" />
                      <ul className="space-y-0 mb-6">
                        {(item.features ?? []).map((f, fi) => (
                          <li
                            key={fi}
                            className="flex gap-2 font-body text-sm text-muted-foreground py-2.5 border-b border-border last:border-b-0"
                          >
                            <Check size={15} className="text-primary shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <Button variant="outline" className="mt-auto w-full" asChild>
                        <a
                          href={getWhatsAppUrl(
                            `Olá! Sou ${proposal.couple_names} e quero o pacote ${item.name}${
                              item.price ? ` (${item.price})` : ""
                            } da proposta ${SITE_URL}/orcamento/${proposal.slug}.`
                          )}
                        >
                          Quero esse pacote
                        </a>
                      </Button>
                    </div>
                  ))}
                </div>

                {total.sum > 0 && (
                  <div className="mt-8 max-w-sm ml-auto bg-card border border-border rounded-xl p-5 font-body text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{brl(total.sum)}</span>
                    </div>
                    {total.discount > 0 && (
                      <div className="flex justify-between text-muted-foreground mt-1">
                        <span>Desconto</span>
                        <span>-{brl(total.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-foreground text-base mt-3 pt-3 border-t border-border">
                      <span>Total</span>
                      <span className="text-primary">{brl(total.final)}</span>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </AnimatedSection>
        )}

        {!!selectedMedia?.photos?.length && (
          <AnimatedSection>
            <section className="py-12 px-4">
              <div className="container mx-auto max-w-6xl">
                <h2 className="font-heading text-2xl md:text-3xl text-foreground text-center mb-8">
                  Nosso trabalho
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
                  {selectedMedia.photos.map((p: any) => (
                    <img
                      key={p.id}
                      src={p.photo_url}
                      alt={p.caption || `Fotografia de casamento — Racun Weddings`}
                      loading="lazy"
                      className="w-full aspect-[4/5] object-cover rounded-lg bg-muted"
                    />
                  ))}
                </div>
              </div>
            </section>
          </AnimatedSection>
        )}

        {!!selectedMedia?.videos?.length && (
          <AnimatedSection>
            <section className="py-12 px-4">
              <div className="container mx-auto max-w-6xl">
                <h2 className="font-heading text-2xl md:text-3xl text-foreground text-center mb-8">
                  Filmes
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {selectedMedia.videos.map((v: any) => {
                    const id = extractYoutubeId(v.youtube_url);
                    return (
                      <button
                        key={v.id}
                        onClick={() => setActiveVideo(id)}
                        className="group relative rounded-lg overflow-hidden bg-muted"
                      >
                        <img
                          src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
                          alt={v.title || "Filme de casamento — Racun Weddings"}
                          loading="lazy"
                          className="w-full aspect-video object-cover"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                          <Play className="text-primary-foreground" size={36} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          </AnimatedSection>
        )}

        {proposal.notes && (
          <section className="py-12 px-4">
            <div className="container mx-auto max-w-3xl bg-card border border-border border-l-4 border-l-primary rounded-xl p-6">
              <h2 className="font-heading text-xl text-foreground mb-3">Observações</h2>
              <p className="font-body text-sm text-muted-foreground whitespace-pre-line">
                {proposal.notes}
              </p>
            </div>
          </section>
        )}

        <section className="py-16 px-4 text-center">
          <div className="container mx-auto max-w-2xl">
            <h2 className="font-heading text-3xl text-foreground mb-4">Vamos eternizar esse dia?</h2>
            {proposal.valid_until && (
              <p className="font-body text-sm text-muted-foreground mb-6">
                Proposta válida até {formatDate(proposal.valid_until)}.
              </p>
            )}
            <Button size="lg" asChild>
              <a
                href={getWhatsAppUrl(
                  `Olá! Sou ${proposal.couple_names} e recebi o orçamento personalizado (${SITE_URL}/orcamento/${proposal.slug}). Gostaria de conversar sobre os próximos passos.`
                )}
              >
                Aprovar / falar no WhatsApp
              </a>
            </Button>
          </div>
        </section>
      </main>

      <Footer />

      {activeVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setActiveVideo(null)}
        >
          <button className="absolute top-4 right-4 text-primary-foreground" aria-label="Fechar">
            <X size={28} />
          </button>
          <div className="w-full max-w-4xl aspect-video" onClick={(e) => e.stopPropagation()}>
            <iframe
              src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`}
              title="Filme de casamento"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
              allowFullScreen
              className="w-full h-full rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Proposal;
