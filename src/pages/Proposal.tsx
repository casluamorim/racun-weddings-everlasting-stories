import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import FloatingWhatsApp from "@/components/landing/FloatingWhatsApp";
import { Button } from "@/components/ui/button";
import { Check, MessageCircle, CalendarDays, MapPin } from "lucide-react";
import { getWhatsAppUrl } from "@/lib/whatsapp";

type Item = { name: string; description?: string; price: number };
type Media = { kind: "photo" | "video"; url: string; title?: string };

const formatBRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const getYouTubeId = (url: string) =>
  url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]+)/)?.[1] ?? "";

const Proposal = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, isError } = useQuery({
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
      return data as any;
    },
  });

  useEffect(() => {
    if (data?.slug) {
      supabase.rpc("increment_proposal_view", { _slug: data.slug });
    }
  }, [data?.slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-6 pt-32 pb-20 space-y-4">
          <div className="h-10 w-2/3 bg-muted animate-pulse rounded" />
          <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
          <div className="grid sm:grid-cols-3 gap-4 mt-8">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-52 bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
          <h1 className="font-heading text-3xl text-foreground">Orçamento não encontrado</h1>
          <p className="font-body text-sm text-muted-foreground">
            Este link pode ter expirado. Fale com a gente para receber um novo.
          </p>
          <Button variant="cta" asChild>
            <a href={getWhatsAppUrl("Olá! Gostaria de receber meu orçamento novamente.")} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={16} /> Falar no WhatsApp
            </a>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const items: Item[] = Array.isArray(data.items) ? data.items : [];
  const media: Media[] = Array.isArray(data.media) ? data.media : [];
  const subtotal = items.reduce((s, i) => s + (Number(i.price) || 0), 0);
  const discount = Number(data.discount) || 0;
  const total = Math.max(0, subtotal - discount);

  const waMessage = `Olá! Acabei de ver o orçamento de ${data.couple_names} (${window.location.origin}/orcamento/${data.slug}) e quero seguir com a reserva.`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{`Orçamento ${data.couple_names} — Racun Weddings`}</title>
        <meta
          name="description"
          content={`Proposta exclusiva de fotografia e filme de casamento para ${data.couple_names}${data.city ? ` em ${data.city}` : ""}.`}
        />
        <meta name="robots" content="noindex, nofollow" />
        <meta property="og:title" content={`Orçamento ${data.couple_names} — Racun Weddings`} />
        <meta property="og:description" content="Sua proposta personalizada de casamento." />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <Navbar />

      {/* Hero */}
      <header className="bg-section-dark text-section-dark-foreground pt-32 pb-16 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-4">Proposta exclusiva</p>
          <h1 className="font-heading text-3xl md:text-5xl font-light italic">{data.couple_names}</h1>
          <div className="w-12 h-[2px] bg-primary mx-auto my-6" />
          <div className="flex flex-wrap items-center justify-center gap-4 font-body text-xs uppercase tracking-[0.15em] text-section-dark-foreground/70">
            {data.event_date && (
              <span className="flex items-center gap-1.5">
                <CalendarDays size={14} />
                {new Date(`${data.event_date}T12:00:00`).toLocaleDateString("pt-BR")}
              </span>
            )}
            {(data.city || data.venue) && (
              <span className="flex items-center gap-1.5">
                <MapPin size={14} />
                {[data.venue, data.city].filter(Boolean).join(" • ")}
              </span>
            )}
          </div>
          {data.intro && (
            <p className="font-body text-sm md:text-base text-section-dark-foreground/80 max-w-2xl mx-auto mt-8 leading-relaxed whitespace-pre-line">
              {data.intro}
            </p>
          )}
        </div>
      </header>

      {/* Investimento */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-3">Investimento</p>
            <h2 className="font-heading text-2xl md:text-4xl font-light text-foreground">O que está incluído</h2>
          </div>

          <div className="space-y-4">
            {items.map((it, idx) => (
              <div key={idx} className="bg-card border border-border rounded-lg p-5 flex flex-col sm:flex-row sm:items-start gap-3">
                <Check size={18} className="text-primary mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-heading text-lg text-foreground">{it.name}</p>
                  {it.description && (
                    <p className="font-body text-xs text-muted-foreground mt-1 leading-relaxed">{it.description}</p>
                  )}
                </div>
                <p className="font-heading text-lg text-primary sm:text-right whitespace-nowrap">
                  {formatBRL(Number(it.price) || 0)}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 border-t border-border pt-6 space-y-2 font-body text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatBRL(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-primary">
                <span>Desconto exclusivo</span>
                <span>- {formatBRL(discount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-3 border-t border-border">
              <span className="font-body text-xs uppercase tracking-[0.2em] text-muted-foreground">Total</span>
              <span className="font-heading text-3xl md:text-4xl text-primary">{formatBRL(total)}</span>
            </div>
            {data.valid_until && (
              <p className="font-body text-xs text-muted-foreground pt-2">
                Proposta válida até {new Date(`${data.valid_until}T12:00:00`).toLocaleDateString("pt-BR")}.
              </p>
            )}
          </div>

          {data.notes && (
            <p className="font-body text-xs text-muted-foreground mt-6 whitespace-pre-line leading-relaxed">
              {data.notes}
            </p>
          )}

          <div className="mt-10 text-center">
            <Button variant="cta" className="uppercase tracking-wider text-xs py-6 px-8" asChild>
              <a href={getWhatsAppUrl(waMessage)} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={16} /> Quero fechar meu casamento
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Portfólio selecionado */}
      {media.length > 0 && (
        <section className="py-16 px-6 bg-section-dark text-section-dark-foreground">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-10">
              <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-3">Nosso trabalho</p>
              <h2 className="font-heading text-2xl md:text-4xl font-light">Casamentos que eternizamos</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
              {media.map((m) =>
                m.kind === "photo" ? (
                  <img
                    key={m.url}
                    src={m.url}
                    alt={m.title || `Fotografia de casamento — Racun Weddings para ${data.couple_names}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full aspect-[4/5] object-cover rounded"
                  />
                ) : (
                  <div key={m.url} className="col-span-2 md:col-span-3 aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${getYouTubeId(m.url)}?rel=0`}
                      title={m.title || "Filme de casamento — Racun Weddings"}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="w-full h-full rounded"
                    />
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      )}

      <Footer />
      <FloatingWhatsApp />
    </div>
  );
};

export default Proposal;
