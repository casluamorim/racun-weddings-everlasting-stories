import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Eye, EyeOff, Film, ImageIcon, Home, GripVertical, Share2 } from "lucide-react";
import { SortableGrid } from "@/components/admin/SortablePhotoGrid";
import { useConfirmReorder } from "@/hooks/useConfirmReorder";

const SITE_URL = "https://weddings.agenciaracun.com";

type MediaRow = {
  id: string;
  kind: "photo" | "video";
  category: "wedding" | "pre_wedding";
  preview: string;
  label: string;
  show_in_home: boolean;
  home_sort_order: number;
  couple?: string | null;
  city?: string | null;
};

const getYouTubeId = (url: string) =>
  url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]+)/)?.[1] ?? "";

const CATEGORY_LABEL: Record<string, string> = {
  wedding: "Casamento",
  pre_wedding: "Pré-Wedding",
};

const AdminHome = () => {
  const queryClient = useQueryClient();
  const { requestReorder, confirmReorderDialog } = useConfirmReorder();
  const FILTERS_KEY = "admin-home-filters";
  const savedFilters = (() => {
    try {
      return JSON.parse(localStorage.getItem(FILTERS_KEY) || "{}");
    } catch {
      return {} as any;
    }
  })();
  const [filterCity, setFilterCity] = useState<string>(savedFilters.filterCity ?? "all");
  const [filterCategory, setFilterCategory] = useState<string>(savedFilters.filterCategory ?? "all");
  const [filterKind, setFilterKind] = useState<string>(savedFilters.filterKind ?? "all");
  const [search, setSearch] = useState<string>(savedFilters.search ?? "");

  useEffect(() => {
    try {
      localStorage.setItem(
        FILTERS_KEY,
        JSON.stringify({ filterCity, filterCategory, filterKind, search })
      );
    } catch { /* ignore */ }
  }, [filterCity, filterCategory, filterKind, search]);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-home-media"],
    queryFn: async (): Promise<MediaRow[]> => {
      const [{ data: photos, error: pErr }, { data: videos, error: vErr }, { data: weddings }] =
        await Promise.all([
          supabase.from("portfolio_photos").select("*"),
          supabase.from("portfolio_videos").select("*"),
          supabase.from("weddings").select("id, couple_names, city"),
        ]);
      if (pErr) throw pErr;
      if (vErr) throw vErr;
      const byId = new Map((weddings || []).map((w: any) => [w.id, w]));

      const list: MediaRow[] = [
        ...((photos || []) as any[]).map((p) => ({
          id: p.id,
          kind: "photo" as const,
          category: (p.category ?? "wedding") as MediaRow["category"],
          preview: p.photo_url,
          label: p.caption || "Foto",
          show_in_home: !!p.show_in_home,
          home_sort_order: p.home_sort_order ?? 0,
          couple: p.wedding_id ? byId.get(p.wedding_id)?.couple_names : "Avulso",
          city: p.wedding_id ? byId.get(p.wedding_id)?.city : null,
        })),
        ...((videos || []) as any[]).map((v) => ({
          id: v.id,
          kind: "video" as const,
          category: (v.category ?? "wedding") as MediaRow["category"],
          preview: `https://img.youtube.com/vi/${getYouTubeId(v.youtube_url)}/mqdefault.jpg`,
          label: v.title || "Vídeo",
          show_in_home: !!v.show_in_home,
          home_sort_order: v.home_sort_order ?? 0,
          couple: v.wedding_id ? byId.get(v.wedding_id)?.couple_names : "Avulso",
          city: v.wedding_id ? byId.get(v.wedding_id)?.city : null,
        })),
      ];
      return list.sort((a, b) => {
        if (a.show_in_home !== b.show_in_home) return a.show_in_home ? -1 : 1;
        return a.home_sort_order - b.home_sort_order;
      });
    },
  });

  const table = (kind: MediaRow["kind"]) => (kind === "photo" ? "portfolio_photos" : "portfolio_videos");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-home-media"] });
    queryClient.invalidateQueries({ queryKey: ["home-feed"] });
  };

  const toggleHome = useMutation({
    mutationFn: async (row: MediaRow) => {
      const { error } = await supabase
        .from(table(row.kind) as any)
        .update({ show_in_home: !row.show_in_home } as any)
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Destaque da home atualizado!");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao atualizar"),
  });

  const selected = useMemo(
    () =>
      (rows || [])
        .filter((r) => r.show_in_home)
        .map((r) => ({ ...r, id: `${r.kind}-${r.id}` })),
    [rows]
  );

  const cities = useMemo(
    () => Array.from(new Set((rows || []).map((r) => r.city).filter(Boolean))) as string[],
    [rows]
  );

  const available = useMemo(
    () =>
      (rows || []).filter((r) => {
        if (r.show_in_home) return false;
        if (filterCity !== "all" && (r.city ?? "") !== filterCity) return false;
        if (filterCategory !== "all" && r.category !== filterCategory) return false;
        if (filterKind !== "all" && r.kind !== filterKind) return false;
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const hay = `${r.label} ${r.couple ?? ""} ${r.city ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      }),
    [rows, filterCity, filterCategory, filterKind, search]
  );

  const persistOrder = async (ordered: MediaRow[]) => {
    await Promise.all(
      ordered.map((r, i) =>
        supabase
          .from(table(r.kind) as any)
          .update({ home_sort_order: i } as any)
          .eq("id", r.id.replace(/^(photo|video)-/, ""))
      )
    );
    invalidate();
  };

  const sharePreview = async () => {
    const url = `${SITE_URL}/?preview=home&t=${Date.now()}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Prévia da Página Inicial", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link de prévia copiado!");
      }
    } catch {
      await navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Link de prévia copiado!");
    }
  };

  const selectClass =
    "h-9 rounded-md border border-input bg-background px-2 font-body text-sm text-foreground";

  return (
    <div>
      {confirmReorderDialog}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <h1 className="font-heading text-2xl text-foreground flex items-center gap-2">
          <Home size={20} /> Página Inicial
        </h1>
        <Button variant="outline" size="sm" onClick={sharePreview}>
          <Share2 size={14} className="mr-1" /> Compartilhar prévia do home
        </Button>
      </div>
      <p className="font-body text-sm text-muted-foreground mb-6">
        Escolha quais fotos e vídeos aparecem no feed da home. Arraste para reordenar — pedimos confirmação antes de salvar e você pode desfazer.
      </p>

      {isLoading ? (
        <p className="font-body text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="font-heading text-lg text-foreground mb-3">
              No feed da home ({selected.length})
            </h2>
            {selected.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">
                Nada selecionado ainda. Escolha abaixo.
              </p>
            ) : (
              <SortableGrid
                items={selected}
                onReorder={(reordered) =>
                  requestReorder(
                    selected as MediaRow[],
                    reordered as MediaRow[],
                    (items) => persistOrder(items as MediaRow[]),
                    "Feed da home"
                  )
                }
                className="space-y-2"
                renderItem={(r) => (
                  <div className="flex items-center gap-3 bg-card border border-border rounded-lg p-2 pr-10">
                    <GripVertical size={14} className="text-muted-foreground shrink-0" />
                    <img src={r.preview} alt="" className="w-16 h-16 rounded object-cover bg-muted" />
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm text-foreground truncate flex items-center gap-1">
                        {r.kind === "video" ? <Film size={12} /> : <ImageIcon size={12} />} {r.label}
                      </p>
                      <p className="font-body text-xs text-muted-foreground truncate">
                        {[r.couple, r.city, CATEGORY_LABEL[r.category]].filter(Boolean).join(" • ")}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Remover da home"
                      onClick={() =>
                        toggleHome.mutate({ ...(r as MediaRow), id: r.id.replace(/^(photo|video)-/, "") })
                      }
                    >
                      <EyeOff size={16} className="text-muted-foreground" />
                    </Button>
                  </div>
                )}
              />
            )}
          </section>

          <section>
            <h2 className="font-heading text-lg text-foreground mb-3">
              Disponíveis ({available.length})
            </h2>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <select className={selectClass} value={filterKind} onChange={(e) => setFilterKind(e.target.value)}>
                <option value="all">Fotos e vídeos</option>
                <option value="photo">Só fotos</option>
                <option value="video">Só vídeos</option>
              </select>
              <select className={selectClass} value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                <option value="all">Casamento + Pré-Wedding</option>
                <option value="wedding">Casamento</option>
                <option value="pre_wedding">Pré-Wedding</option>
              </select>
              <select className={selectClass} value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
                <option value="all">Todas as cidades</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por casal, legenda ou cidade..."
                className="h-9 text-sm w-full sm:w-64"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {available.map((r) => (
                <button
                  key={`${r.kind}-${r.id}`}
                  onClick={() => toggleHome.mutate(r)}
                  className="group relative rounded-lg overflow-hidden bg-muted border border-border text-left"
                  title="Adicionar à home"
                >
                  <img src={r.preview} alt="" className="w-full aspect-square object-cover" />
                  <span className="absolute top-1 left-1 bg-background/80 rounded px-1.5 py-0.5">
                    {r.kind === "video" ? <Film size={11} /> : <ImageIcon size={11} />}
                  </span>
                  <span className="absolute top-1 right-1 bg-background/80 rounded px-1.5 py-0.5 font-body text-[10px] text-muted-foreground">
                    {CATEGORY_LABEL[r.category]}
                  </span>
                  <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye size={18} className="text-primary-foreground" />
                  </span>
                  <span className="block p-1.5 font-body text-[11px] text-muted-foreground truncate">
                    {[r.couple, r.city].filter(Boolean).join(" • ")}
                  </span>
                </button>
              ))}
              {available.length === 0 && (
                <p className="font-body text-sm text-muted-foreground col-span-full">
                  Nenhuma mídia com esses filtros.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminHome;
