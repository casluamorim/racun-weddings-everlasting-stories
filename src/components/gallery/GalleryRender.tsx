import { useEffect, useMemo, useState } from "react";
import { Heart, Download, Share2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DesignSettings, ensureFontsLoaded, hexToRgba } from "@/lib/galleryDesign";

export type GalleryFileLite = {
  id: string;
  kind: string;
  file_name: string;
  thumb_path?: string | null;
  web_path: string;
  original_path?: string | null;
  is_pinned?: boolean;
  sort_order?: number;
};

export type GalleryLite = {
  id: string;
  couple_names: string;
  event_date?: string | null;
  city?: string | null;
  venue?: string | null;
  description?: string | null;
  story?: string | null;
  cover_url?: string | null;
  slug: string;
  hero_video_url?: string | null;
};

type Props = {
  gallery: GalleryLite;
  files: GalleryFileLite[];
  urls: Record<string, string>;
  design: DesignSettings;
  favorites?: Set<string>;
  onToggleFav?: (id: string) => void;
  onDownloadOne?: (f: GalleryFileLite) => void;
  onDownloadAll?: () => void;
  onShare?: () => void;
  ctaWhatsappUrl?: string;
  /** Constrains preview to container size (no min-h-screen, no sticky). */
  embedded?: boolean;
  /** Forces mobile-like layout in preview. */
  forceMobile?: boolean;
};

const shadowMap = { none: "shadow-none", sm: "shadow-sm", md: "shadow-md", lg: "shadow-lg" } as const;

export function GalleryRender({
  gallery,
  files,
  urls,
  design,
  favorites,
  onToggleFav,
  onDownloadOne,
  onDownloadAll,
  onShare,
  ctaWhatsappUrl,
  embedded = false,
  forceMobile = false,
}: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  useEffect(() => {
    ensureFontsLoaded([design.typography.heading, design.typography.body]);
  }, [design.typography.heading, design.typography.body]);

  const photos = useMemo(() => files.filter((f) => f.kind === "photo"), [files]);
  const videos = useMemo(() => files.filter((f) => f.kind === "video"), [files]);
  const heroUrl = gallery.cover_url ?? (files[0] ? urls[files[0].web_path] : undefined);

  const t = design.toggles;
  const c = design.colors;
  const cov = design.cover;
  const ty = design.typography;
  const g = design.grid;

  const justifyMap = { left: "items-start text-left", center: "items-center text-center", right: "items-end text-right" } as const;
  const alignMap = { top: "justify-start pt-12", center: "justify-center", bottom: "justify-end pb-12" } as const;

  // Grid styles
  const gridStyle: React.CSSProperties = {
    gap: `${g.gap}px`,
    columnCount: g.layout === "masonry" ? Math.max(1, g.columns) : undefined,
  };
  const classicCols = forceMobile ? 2 : g.columns;
  const itemRadius = `${g.radius}px`;
  const hoverCls =
    g.hover === "zoom" ? "transition-transform duration-700 group-hover:scale-105"
    : g.hover === "fade" ? "transition-opacity duration-500 group-hover:opacity-80"
    : g.hover === "lift" ? "transition-transform duration-300 group-hover:-translate-y-1"
    : "";

  return (
    <div
      style={{ backgroundColor: c.bg, color: c.text, fontFamily: ty.body }}
      className={embedded ? "w-full" : "min-h-screen"}
    >
      {/* HERO */}
      <section
        className={`relative overflow-hidden flex flex-col ${justifyMap[ty.align]} ${alignMap[cov.align]}`}
        style={{ height: embedded ? `${Math.min(cov.heightVh, 70)}vh` : `${cov.heightVh}vh`, minHeight: embedded ? 240 : 360 }}
      >
        {cov.type === "video" && cov.heroVideoUrl ? (
          <video
            src={cov.heroVideoUrl}
            autoPlay muted loop playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: `scale(${cov.zoom})`, objectPosition: cov.position, filter: cov.blur ? `blur(${cov.blur}px)` : undefined }}
          />
        ) : heroUrl ? (
          <img
            src={heroUrl} alt=""
            className={`absolute inset-0 w-full h-full object-cover ${cov.parallax ? "[transform:translateZ(0)]" : ""}`}
            style={{ transform: `scale(${cov.zoom})`, objectPosition: cov.position, filter: cov.blur ? `blur(${cov.blur}px)` : undefined }}
          />
        ) : (
          <div className="absolute inset-0 bg-muted" />
        )}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${hexToRgba(c.overlay, cov.overlay)} 0%, ${hexToRgba(c.overlay, cov.overlay * 0.4)} 50%, transparent 100%)` }} />
        <div className={`relative z-10 px-6 md:px-16 max-w-3xl ${ty.align === "center" ? "mx-auto" : ty.align === "right" ? "ml-auto" : ""}`}>
          <p className="text-[10px] tracking-[0.35em] uppercase opacity-80" style={{ color: ty.subtitleColor }}>Racun Weddings</p>
          {t.showCouple && (
            <h1
              className="mt-4"
              style={{
                fontFamily: ty.heading,
                fontSize: forceMobile ? Math.max(28, ty.titleSize * 0.55) : ty.titleSize,
                fontWeight: ty.titleWeight,
                letterSpacing: `${ty.letterSpacing / 100}em`,
                lineHeight: 1.05,
                color: ty.titleColor,
              }}
            >
              {gallery.couple_names}
            </h1>
          )}
          <p className="mt-4 text-sm md:text-base opacity-90" style={{ color: ty.subtitleColor }}>
            {t.showDate && gallery.event_date && new Date(gallery.event_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            {t.showVenue && gallery.venue && ` · ${gallery.venue}`}
            {t.showVenue && gallery.city && ` · ${gallery.city}`}
          </p>
          {t.showDescription && gallery.description && (
            <p className="mt-6 max-w-xl opacity-90" style={{ color: ty.subtitleColor }}>{gallery.description}</p>
          )}
        </div>
      </section>

      {/* Action bar */}
      {(t.showCount || t.showShare || t.showDownload) && (
        <div className={`${embedded ? "" : "sticky top-0 z-30"} backdrop-blur border-b`} style={{ backgroundColor: hexToRgba(c.bg, 0.92), borderColor: hexToRgba(c.text, 0.1) }}>
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            {t.showCount ? (
              <p className="text-xs md:text-sm opacity-70">{photos.length} fotos · {videos.length} vídeos</p>
            ) : <span />}
            <div className="flex gap-2">
              {t.showShare && (
                <button onClick={onShare} className="inline-flex items-center gap-1 text-xs px-3 py-2 rounded border" style={{ borderColor: hexToRgba(c.text, 0.2) }}>
                  <Share2 className="h-3.5 w-3.5" />Compartilhar
                </button>
              )}
              {t.showDownload && (
                <button onClick={onDownloadAll} className="inline-flex items-center gap-1 text-xs px-3 py-2 rounded text-white" style={{ backgroundColor: c.button }}>
                  <Download className="h-3.5 w-3.5" />Baixar tudo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Story */}
      {gallery.story && (
        <section className={`max-w-2xl mx-auto px-6 ${embedded ? "py-10" : "py-20"} text-center`}>
          <p style={{ fontFamily: ty.heading }} className="text-xl md:text-3xl leading-relaxed italic">"{gallery.story}"</p>
        </section>
      )}

      {/* Film */}
      {t.showFilm && videos.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 py-8 space-y-4">
          <h2 style={{ fontFamily: ty.heading }} className="text-2xl">Filme</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {videos.map((v) => urls[v.web_path] && (
              <video key={v.id} src={urls[v.web_path]} controls className="w-full bg-black" style={{ borderRadius: itemRadius }} preload="metadata" />
            ))}
          </div>
        </section>
      )}

      {/* PHOTO GRID */}
      <section className="max-w-7xl mx-auto px-4 py-8">
        {g.layout === "masonry" ? (
          <div style={{ columnCount: forceMobile ? 2 : g.columns, columnGap: `${g.gap}px` }}>
            {photos.map((f, idx) => (
              <PhotoItem
                key={f.id} f={f} idx={idx} thumb={urls[f.thumb_path || f.web_path]}
                onOpen={() => setActiveIdx(idx)}
                onFav={onToggleFav} isFav={!!favorites?.has(f.id)} showFav={t.showFavorites}
                radius={itemRadius} shadowCls={shadowMap[g.shadow]} hoverCls={hoverCls} masonry
                style={{ marginBottom: `${g.gap}px` }}
              />
            ))}
          </div>
        ) : g.layout === "slider" ? (
          <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-4">
            {photos.map((f, idx) => (
              <div key={f.id} className="flex-none snap-center" style={{ width: forceMobile ? "85%" : "60%" }}>
                <PhotoItem f={f} idx={idx} thumb={urls[f.thumb_path || f.web_path]} onOpen={() => setActiveIdx(idx)}
                  onFav={onToggleFav} isFav={!!favorites?.has(f.id)} showFav={t.showFavorites}
                  radius={itemRadius} shadowCls={shadowMap[g.shadow]} hoverCls={hoverCls}
                  fixedAspect={g.layout === "slider" ? "aspect-[3/2]" : undefined}
                />
              </div>
            ))}
          </div>
        ) : g.layout === "fullscreen" ? (
          <div className="space-y-2">
            {photos.map((f, idx) => (
              <PhotoItem key={f.id} f={f} idx={idx} thumb={urls[f.web_path]} onOpen={() => setActiveIdx(idx)}
                onFav={onToggleFav} isFav={!!favorites?.has(f.id)} showFav={t.showFavorites}
                radius={itemRadius} shadowCls={shadowMap[g.shadow]} hoverCls={hoverCls}
                fixedAspect="aspect-[16/9]" />
            ))}
          </div>
        ) : (
          // classic / editorial / magazine / minimal — uniform grid w/ variable aspect
          <div className="grid" style={{ gap: `${g.gap}px`, gridTemplateColumns: `repeat(${classicCols}, minmax(0, 1fr))` }}>
            {photos.map((f, idx) => {
              const aspect = g.layout === "editorial" && idx % 5 === 0 ? "aspect-[3/4]"
                : g.layout === "magazine" && idx % 7 === 0 ? "aspect-[4/3]"
                : g.layout === "minimal" ? "aspect-square" : "aspect-[3/4]";
              return (
                <PhotoItem key={f.id} f={f} idx={idx} thumb={urls[f.thumb_path || f.web_path]}
                  onOpen={() => setActiveIdx(idx)} onFav={onToggleFav} isFav={!!favorites?.has(f.id)}
                  showFav={t.showFavorites} radius={itemRadius} shadowCls={shadowMap[g.shadow]} hoverCls={hoverCls}
                  fixedAspect={aspect} />
              );
            })}
          </div>
        )}
      </section>

      {/* CTA */}
      {t.showCta && (
        <section className="py-20 px-6 text-center mt-12" style={{ backgroundColor: c.secondary, color: ty.titleColor }}>
          <p className="text-[10px] tracking-[0.35em] uppercase opacity-60">Racun Weddings</p>
          <h2 style={{ fontFamily: ty.heading }} className="text-3xl md:text-5xl mt-4 max-w-3xl mx-auto">
            Seu casamento também merece ser contado assim.
          </h2>
          {ctaWhatsappUrl && (
            <div className="flex gap-3 justify-center mt-8 flex-wrap">
              <a href={ctaWhatsappUrl} target="_blank" rel="noopener"
                 className="inline-flex items-center px-6 py-3 rounded text-white text-sm font-medium"
                 style={{ backgroundColor: c.button }}>
                Falar no WhatsApp
              </a>
            </div>
          )}
        </section>
      )}

      {/* Lightbox */}
      {!embedded && (
        <Dialog open={activeIdx !== null} onOpenChange={(o) => !o && setActiveIdx(null)}>
          <DialogContent className="max-w-7xl w-full p-0 bg-black border-none">
            {activeIdx !== null && photos[activeIdx] && (
              <div className="relative">
                <img src={urls[photos[activeIdx].web_path]} alt="" className="w-full max-h-[90vh] object-contain" />
                <div className="absolute top-2 right-2 flex gap-2">
                  {t.showFavorites && (
                    <Button size="icon" variant="secondary" onClick={() => onToggleFav?.(photos[activeIdx].id)}>
                      <Heart className={`h-4 w-4 ${favorites?.has(photos[activeIdx].id) ? "fill-primary text-primary" : ""}`} />
                    </Button>
                  )}
                  {t.showDownload && (
                    <Button size="icon" variant="secondary" onClick={() => onDownloadOne?.(photos[activeIdx])}><Download className="h-4 w-4" /></Button>
                  )}
                  <Button size="icon" variant="secondary" onClick={() => setActiveIdx(null)}><X className="h-4 w-4" /></Button>
                </div>
                {activeIdx > 0 && (
                  <Button size="icon" variant="secondary" className="absolute left-2 top-1/2 -translate-y-1/2" onClick={() => setActiveIdx(activeIdx - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                {activeIdx < photos.length - 1 && (
                  <Button size="icon" variant="secondary" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setActiveIdx(activeIdx + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function PhotoItem({
  f, thumb, onOpen, onFav, isFav, showFav, radius, shadowCls, hoverCls, masonry, fixedAspect, style,
}: {
  f: GalleryFileLite; idx: number; thumb?: string; onOpen: () => void; onFav?: (id: string) => void;
  isFav: boolean; showFav: boolean; radius: string; shadowCls: string; hoverCls: string; masonry?: boolean;
  fixedAspect?: string; style?: React.CSSProperties;
}) {
  return (
    <div
      className={`relative group overflow-hidden bg-muted ${masonry ? "break-inside-avoid inline-block w-full" : ""} ${shadowCls} ${fixedAspect ?? ""}`}
      style={{ borderRadius: radius, contentVisibility: "auto", containIntrinsicSize: "400px 600px", ...style }}
    >
      {thumb ? (
        <img src={thumb} alt="" loading="lazy" decoding="async" onClick={onOpen}
             className={`w-full ${fixedAspect ? "h-full object-cover" : "h-auto"} cursor-pointer ${hoverCls}`} />
      ) : (
        <Skeleton className={fixedAspect ? "w-full h-full" : "w-full aspect-[3/4]"} />
      )}
      {showFav && onFav && (
        <button onClick={(e) => { e.stopPropagation(); onFav(f.id); }}
                className="absolute top-2 right-2 p-2 rounded-full bg-black/50 backdrop-blur opacity-0 group-hover:opacity-100 transition">
          <Heart className={`h-4 w-4 ${isFav ? "fill-primary text-primary" : "text-white"}`} />
        </button>
      )}
      {f.is_pinned && (
        <span className="absolute top-2 left-2 text-[9px] uppercase tracking-wider bg-white/90 text-black px-1.5 py-0.5 rounded">Destaque</span>
      )}
    </div>
  );
}
