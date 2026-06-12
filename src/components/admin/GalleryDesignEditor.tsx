import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Monitor, Tablet, Smartphone, Save, Copy, Undo2, Redo2, RotateCcw, Bookmark, Trash2, SplitSquareHorizontal, Eye, Crop } from "lucide-react";
import { signedUrls } from "@/lib/galleryStorage";
import { GalleryRender } from "@/components/gallery/GalleryRender";
import { DesignSettings, DEFAULT_DESIGN, mergeDesign, FONT_OPTIONS, ensureFontsLoaded } from "@/lib/galleryDesign";
import CoverCropDialog from "@/components/admin/CoverCropDialog";

type Props = { galleryId: string };

const HERO_TEMPLATES: Record<string, Partial<DesignSettings>> = {
  Romance: {
    cover: { ...DEFAULT_DESIGN.cover, overlay: 0.4, align: "center", position: "center", parallax: true },
    typography: { ...DEFAULT_DESIGN.typography, heading: "Cormorant Garamond", titleSize: 84, letterSpacing: 4, align: "center", titleColor: "#fff8f0" },
    colors: { ...DEFAULT_DESIGN.colors, primary: "#d4a574", secondary: "#1a0f0a", bg: "#0a0604", overlay: "#1a0f0a" },
  },
  Luxury: {
    cover: { ...DEFAULT_DESIGN.cover, overlay: 0.65, align: "bottom", parallax: true, zoom: 1.05 },
    typography: { ...DEFAULT_DESIGN.typography, heading: "Bodoni Moda", titleSize: 92, titleWeight: 500, align: "left", titleColor: "#f5e6c8" },
    colors: { ...DEFAULT_DESIGN.colors, primary: "#c9a84c", secondary: "#0d0d0d", bg: "#0a0a0a", button: "#c9a84c", overlay: "#000000" },
  },
  Editorial: {
    cover: { ...DEFAULT_DESIGN.cover, overlay: 0.35, align: "bottom", position: "left" },
    typography: { ...DEFAULT_DESIGN.typography, heading: "Playfair Display", titleSize: 76, align: "left" },
    colors: { ...DEFAULT_DESIGN.colors, primary: "#111111", bg: "#fafaf7", text: "#1a1a1a", secondary: "#1a1a1a", overlay: "#000000" },
    grid: { ...DEFAULT_DESIGN.grid, layout: "editorial", columns: 3, gap: 16 },
  },
  Clean: {
    cover: { ...DEFAULT_DESIGN.cover, overlay: 0.3, heightVh: 70, align: "center", position: "center" },
    typography: { ...DEFAULT_DESIGN.typography, heading: "Jost", titleSize: 60, letterSpacing: 8, align: "center", titleWeight: 300 },
    colors: { ...DEFAULT_DESIGN.colors, primary: "#1a1a1a", bg: "#ffffff", text: "#1a1a1a", secondary: "#1a1a1a", button: "#1a1a1a", overlay: "#000000" },
    grid: { ...DEFAULT_DESIGN.grid, layout: "minimal", columns: 4, gap: 4 },
  },
  Minimal: {
    cover: { ...DEFAULT_DESIGN.cover, overlay: 0.2, heightVh: 65, align: "center", position: "center" },
    typography: { ...DEFAULT_DESIGN.typography, heading: "Inter", titleSize: 48, titleWeight: 300, letterSpacing: 10, align: "center" },
    colors: { ...DEFAULT_DESIGN.colors, primary: "#000", bg: "#fff", text: "#111", secondary: "#111", button: "#111", overlay: "#000" },
    grid: { ...DEFAULT_DESIGN.grid, layout: "classic", columns: 3, gap: 2, radius: 0 },
  },
  "Fine Art": {
    cover: { ...DEFAULT_DESIGN.cover, overlay: 0.45, blur: 0, align: "bottom", parallax: true },
    typography: { ...DEFAULT_DESIGN.typography, heading: "EB Garamond", titleSize: 88, align: "left", titleColor: "#e8e0d4" },
    colors: { ...DEFAULT_DESIGN.colors, primary: "#8b7355", bg: "#1a1612", text: "#e8e0d4", secondary: "#0d0a07", button: "#8b7355", overlay: "#000" },
    grid: { ...DEFAULT_DESIGN.grid, layout: "masonry", columns: 3, gap: 20 },
  },
  "Dark Luxury": {
    cover: { ...DEFAULT_DESIGN.cover, overlay: 0.7, align: "bottom" },
    typography: { ...DEFAULT_DESIGN.typography, heading: "Cinzel", titleSize: 64, letterSpacing: 6, titleColor: "#f0d78c" },
    colors: { ...DEFAULT_DESIGN.colors, primary: "#f0d78c", bg: "#050505", text: "#f5f5f5", secondary: "#0a0a0a", button: "#c9a84c", overlay: "#000" },
  },
  "Classic Wedding": {
    cover: { ...DEFAULT_DESIGN.cover, overlay: 0.5, align: "bottom", position: "center" },
    typography: { ...DEFAULT_DESIGN.typography, heading: "Libre Caslon Text", titleSize: 72, align: "center" },
    colors: { ...DEFAULT_DESIGN.colors, primary: "#7a6650", bg: "#faf6f0", text: "#2a1f15", secondary: "#2a1f15", button: "#7a6650", overlay: "#1a0f0a" },
    grid: { ...DEFAULT_DESIGN.grid, layout: "classic", columns: 3, gap: 12 },
  },
  "Modern Wedding": {
    cover: { ...DEFAULT_DESIGN.cover, overlay: 0.4, align: "bottom" },
    typography: { ...DEFAULT_DESIGN.typography, heading: "DM Sans", titleSize: 68, titleWeight: 500, align: "left" },
    colors: { ...DEFAULT_DESIGN.colors, primary: "#f60eca", bg: "#0a0a0a", secondary: "#111", overlay: "#000" },
  },
  Cinematic: {
    cover: { ...DEFAULT_DESIGN.cover, overlay: 0.6, heightVh: 100, align: "bottom", parallax: true, zoom: 1.08 },
    typography: { ...DEFAULT_DESIGN.typography, heading: "Cormorant Infant", titleSize: 96, align: "left", letterSpacing: 2 },
    colors: { ...DEFAULT_DESIGN.colors, primary: "#e8c07a", bg: "#000", secondary: "#000", overlay: "#000" },
    grid: { ...DEFAULT_DESIGN.grid, layout: "fullscreen", gap: 4 },
  },
};

export default function GalleryDesignEditor({ galleryId }: Props) {
  const qc = useQueryClient();
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [dirty, setDirty] = useState(false);

  const { data: gallery } = useQuery({
    queryKey: ["admin-gallery", galleryId],
    queryFn: async () => {
      const { data, error } = await supabase.from("wedding_galleries").select("*").eq("id", galleryId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: files } = useQuery({
    queryKey: ["admin-gallery-files", galleryId],
    queryFn: async () => {
      const { data, error } = await supabase.from("gallery_files").select("*").eq("gallery_id", galleryId)
        .order("is_pinned", { ascending: false }).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // History stack for undo/redo
  const [design, setDesignState] = useState<DesignSettings>(DEFAULT_DESIGN);
  const [history, setHistory] = useState<DesignSettings[]>([DEFAULT_DESIGN]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [initialDesign, setInitialDesign] = useState<DesignSettings>(DEFAULT_DESIGN);

  useEffect(() => {
    if (gallery) {
      const merged = mergeDesign(gallery.design_settings);
      setDesignState(merged);
      setHistory([merged]);
      setHistoryIndex(0);
      setInitialDesign(merged);
      setDirty(false);
    }
  }, [gallery]);

  const pushHistory = (next: DesignSettings) => {
    setHistory((h) => {
      const trimmed = h.slice(0, historyIndex + 1);
      // dedupe consecutive identical states
      if (JSON.stringify(trimmed[trimmed.length - 1]) === JSON.stringify(next)) return trimmed;
      const newHist = [...trimmed, next].slice(-50); // cap at 50 entries
      setHistoryIndex(newHist.length - 1);
      return newHist;
    });
  };

  const setDesign = (updater: DesignSettings | ((d: DesignSettings) => DesignSettings)) => {
    setDesignState((prev) => {
      const next = typeof updater === "function" ? (updater as any)(prev) : updater;
      pushHistory(next);
      return next;
    });
    setDirty(true);
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const undo = () => {
    if (!canUndo) return;
    const i = historyIndex - 1;
    setHistoryIndex(i);
    setDesignState(history[i]);
    setDirty(JSON.stringify(history[i]) !== JSON.stringify(initialDesign));
  };

  const redo = () => {
    if (!canRedo) return;
    const i = historyIndex + 1;
    setHistoryIndex(i);
    setDesignState(history[i]);
    setDirty(JSON.stringify(history[i]) !== JSON.stringify(initialDesign));
  };

  const resetToSaved = () => {
    setDesignState(initialDesign);
    setHistory([initialDesign]);
    setHistoryIndex(0);
    setDirty(false);
    toast.success("Revertido para a última versão salva");
  };

  // Keyboard shortcuts: Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z / Ctrl+Y
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [historyIndex, history]);

  useEffect(() => {
    ensureFontsLoaded([design.typography.heading, design.typography.body]);
  }, [design.typography.heading, design.typography.body]);


  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!files?.length) return;
    const paths = files.flatMap((f) => [f.thumb_path, f.web_path].filter(Boolean) as string[]).slice(0, 200);
    signedUrls(paths, 3600).then(setUrls).catch(() => {});
  }, [files]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("wedding_galleries").update({ design_settings: design as any }).eq("id", galleryId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-gallery", galleryId] });
      setInitialDesign(design);
      setDirty(false);
      toast.success("Design salvo!");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar"),
  });

  const update = <K extends keyof DesignSettings>(section: K, patch: Partial<DesignSettings[K]>) => {
    setDesign((d) => ({ ...d, [section]: { ...d[section], ...patch } }));
  };

  const applyTemplate = (name: string) => {
    const t = HERO_TEMPLATES[name];
    if (!t) return;
    setDesign((d) => mergeDesign({ ...d, ...t }));
    toast.success(`Template "${name}" aplicado — ajuste e salve.`);
  };

  // Duplicate design from another gallery
  const { data: otherGalleries } = useQuery({
    queryKey: ["other-galleries", galleryId],
    queryFn: async () => {
      const { data, error } = await supabase.from("wedding_galleries").select("id, couple_names, design_settings").neq("id", galleryId);
      if (error) throw error;
      return data;
    },
  });

  // Saved presets
  const { data: presets } = useQuery({
    queryKey: ["gallery-design-presets"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("gallery_design_presets").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; name: string; description: string | null; design_settings: any }>;
    },
  });

  const savePresetMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const { error } = await (supabase as any).from("gallery_design_presets").insert({ name, description: description || null, design_settings: design as any });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gallery-design-presets"] });
      toast.success("Preset salvo!");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar preset"),
  });

  const deletePresetMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("gallery_design_presets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gallery-design-presets"] });
      toast.success("Preset excluído");
    },
  });

  const handleSavePreset = () => {
    const name = window.prompt("Nome do preset:");
    if (!name?.trim()) return;
    const description = window.prompt("Descrição (opcional):") || undefined;
    savePresetMutation.mutate({ name: name.trim(), description });
  };

  const applyPreset = (p: { name: string; design_settings: any }) => {
    setDesign(mergeDesign(p.design_settings));
    toast.success(`Preset "${p.name}" aplicado`);
  };

  // Compare mode (before/after)
  const [compareMode, setCompareMode] = useState<"off" | "split" | "toggle">("off");
  const [showingBefore, setShowingBefore] = useState(false);


  const previewWidth = useMemo(() => (device === "mobile" ? 390 : device === "tablet" ? 820 : "100%"), [device]);

  if (!gallery) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="grid lg:grid-cols-[380px_1fr] gap-4">
      {/* CONTROLS */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sticky top-0 z-10 bg-background py-2 border-b">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl">Design da Galeria</h2>
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending}>
              <Save className="h-4 w-4 mr-1" />{saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" className="h-8 px-2" onClick={undo} disabled={!canUndo} title="Desfazer (Ctrl+Z)">
              <Undo2 className="h-3.5 w-3.5 mr-1" />Desfazer
            </Button>
            <Button size="sm" variant="outline" className="h-8 px-2" onClick={redo} disabled={!canRedo} title="Refazer (Ctrl+Shift+Z)">
              <Redo2 className="h-3.5 w-3.5 mr-1" />Refazer
            </Button>
            <Button size="sm" variant="ghost" className="h-8 px-2 ml-auto" onClick={resetToSaved} disabled={!dirty} title="Reverter para última versão salva">
              <RotateCcw className="h-3.5 w-3.5 mr-1" />Reverter
            </Button>
            <span className="text-[10px] text-muted-foreground tabular-nums">{historyIndex + 1}/{history.length}</span>
          </div>
        </div>

        <Tabs defaultValue="capa">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="capa">Capa</TabsTrigger>
            <TabsTrigger value="tipo">Tipo</TabsTrigger>
            <TabsTrigger value="cores">Cores</TabsTrigger>
            <TabsTrigger value="grid">Grid</TabsTrigger>
            <TabsTrigger value="exibir">Exibir</TabsTrigger>
          </TabsList>

          {/* CAPA */}
          <TabsContent value="capa" className="space-y-4 pt-4">
            <div>
              <Label className="text-xs">Templates</Label>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {Object.keys(HERO_TEMPLATES).map((name) => (
                  <Button key={name} size="sm" variant="outline" className="text-xs h-8" onClick={() => applyTemplate(name)}>{name}</Button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs">Tipo do hero</Label>
              <Select value={design.cover.type} onValueChange={(v: any) => update("cover", { type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">Imagem</SelectItem>
                  <SelectItem value="video">Vídeo</SelectItem>
                  <SelectItem value="slider">Slider</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {design.cover.type === "video" && (
              <div>
                <Label className="text-xs">URL do vídeo (mp4 público)</Label>
                <Input value={design.cover.heroVideoUrl ?? ""} onChange={(e) => update("cover", { heroVideoUrl: e.target.value })} placeholder="https://..." />
              </div>
            )}

            <SliderRow label="Altura do hero (vh)" min={50} max={100} step={5} value={design.cover.heightVh} onChange={(v) => update("cover", { heightVh: v })} />
            <SliderRow label="Overlay" min={0} max={1} step={0.05} value={design.cover.overlay} onChange={(v) => update("cover", { overlay: v })} />
            <SliderRow label="Blur" min={0} max={20} step={1} value={design.cover.blur} onChange={(v) => update("cover", { blur: v })} />
            <SliderRow label="Zoom" min={1} max={1.5} step={0.02} value={design.cover.zoom} onChange={(v) => update("cover", { zoom: v })} />

            <SegRow label="Posição imagem" value={design.cover.position} options={["left","center","right"]} onChange={(v) => update("cover", { position: v as any })} />
            <SegRow label="Alinhamento vertical" value={design.cover.align} options={["top","center","bottom"]} onChange={(v) => update("cover", { align: v as any })} />

            <label className="flex items-center justify-between border rounded p-2.5">
              <span className="text-sm">Parallax suave</span>
              <Switch checked={design.cover.parallax} onCheckedChange={(v) => update("cover", { parallax: v })} />
            </label>
          </TabsContent>

          {/* TIPOGRAFIA */}
          <TabsContent value="tipo" className="space-y-4 pt-4">
            <FontSelect label="Fonte do título" value={design.typography.heading} onChange={(v) => update("typography", { heading: v })} />
            <FontSelect label="Fonte do corpo" value={design.typography.body} onChange={(v) => update("typography", { body: v })} />
            <SliderRow label="Tamanho do título" min={32} max={120} step={2} value={design.typography.titleSize} onChange={(v) => update("typography", { titleSize: v })} />
            <SliderRow label="Peso" min={300} max={800} step={100} value={design.typography.titleWeight} onChange={(v) => update("typography", { titleWeight: v })} />
            <SliderRow label="Espaçamento (letter)" min={-2} max={20} step={1} value={design.typography.letterSpacing} onChange={(v) => update("typography", { letterSpacing: v })} />
            <SegRow label="Alinhamento" value={design.typography.align} options={["left","center","right"]} onChange={(v) => update("typography", { align: v as any })} />
            <ColorRow label="Cor do título" value={design.typography.titleColor} onChange={(v) => update("typography", { titleColor: v })} />
            <ColorRow label="Cor do subtítulo" value={design.typography.subtitleColor} onChange={(v) => update("typography", { subtitleColor: v })} />
          </TabsContent>

          {/* CORES */}
          <TabsContent value="cores" className="space-y-3 pt-4">
            <Button size="sm" variant="outline" className="w-full" onClick={() => { setDesign((d) => ({ ...d, colors: DEFAULT_DESIGN.colors })); setDirty(true); }}>
              Padrão Racun Weddings
            </Button>
            <ColorRow label="Primária" value={design.colors.primary} onChange={(v) => update("colors", { primary: v })} />
            <ColorRow label="Secundária (CTA bg)" value={design.colors.secondary} onChange={(v) => update("colors", { secondary: v })} />
            <ColorRow label="Fundo" value={design.colors.bg} onChange={(v) => update("colors", { bg: v })} />
            <ColorRow label="Texto" value={design.colors.text} onChange={(v) => update("colors", { text: v })} />
            <ColorRow label="Botão" value={design.colors.button} onChange={(v) => update("colors", { button: v })} />
            <ColorRow label="Overlay da capa" value={design.colors.overlay} onChange={(v) => update("colors", { overlay: v })} />
          </TabsContent>

          {/* GRID */}
          <TabsContent value="grid" className="space-y-4 pt-4">
            <div>
              <Label className="text-xs">Layout</Label>
              <Select value={design.grid.layout} onValueChange={(v: any) => update("grid", { layout: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="masonry">Pinterest / Masonry</SelectItem>
                  <SelectItem value="classic">Grid clássico</SelectItem>
                  <SelectItem value="editorial">Editorial</SelectItem>
                  <SelectItem value="magazine">Magazine</SelectItem>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="fullscreen">Fullscreen</SelectItem>
                  <SelectItem value="slider">Slider horizontal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SliderRow label="Colunas" min={2} max={6} step={1} value={design.grid.columns} onChange={(v) => update("grid", { columns: v })} />
            <SliderRow label="Espaçamento" min={0} max={32} step={1} value={design.grid.gap} onChange={(v) => update("grid", { gap: v })} />
            <SliderRow label="Arredondamento" min={0} max={24} step={1} value={design.grid.radius} onChange={(v) => update("grid", { radius: v })} />
            <SegRow label="Sombra" value={design.grid.shadow} options={["none","sm","md","lg"]} onChange={(v) => update("grid", { shadow: v as any })} />
            <SegRow label="Hover" value={design.grid.hover} options={["zoom","fade","lift","none"]} onChange={(v) => update("grid", { hover: v as any })} />
          </TabsContent>

          {/* EXIBIR (toggles) */}
          <TabsContent value="exibir" className="space-y-2 pt-4">
            {([
              ["showCouple", "Nome do casal"], ["showDate", "Data"], ["showVenue", "Local / cidade"],
              ["showDescription", "Descrição"], ["showCta", "CTA final"], ["showFilm", "Vídeos destacados"],
              ["showCount", "Contador de fotos"], ["showFavorites", "Favoritos"],
              ["showDownload", "Botão download"], ["showShare", "Botão compartilhar"],
            ] as const).map(([k, lbl]) => (
              <label key={k} className="flex items-center justify-between border rounded p-2.5">
                <span className="text-sm">{lbl}</span>
                <Switch checked={(design.toggles as any)[k]} onCheckedChange={(v) => update("toggles", { [k]: v } as any)} />
              </label>
            ))}
          </TabsContent>
        </Tabs>

        {/* Presets salvos */}
        <div className="border rounded p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs flex items-center gap-1"><Bookmark className="h-3 w-3" />Meus presets</Label>
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSavePreset} disabled={savePresetMutation.isPending}>
              Salvar atual
            </Button>
          </div>
          {presets && presets.length > 0 ? (
            <div className="max-h-40 overflow-auto space-y-1">
              {presets.map((p) => (
                <div key={p.id} className="flex items-center gap-1 border rounded px-2 py-1.5 hover:bg-muted/40">
                  <button onClick={() => applyPreset(p)} className="flex-1 text-left">
                    <p className="text-xs font-medium truncate">{p.name}</p>
                    {p.description && <p className="text-[10px] text-muted-foreground truncate">{p.description}</p>}
                  </button>
                  <button onClick={() => { if (confirm(`Excluir preset "${p.name}"?`)) deletePresetMutation.mutate(p.id); }} className="opacity-50 hover:opacity-100 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">Nenhum preset salvo ainda. Configure um design e clique em "Salvar atual".</p>
          )}
        </div>

        {/* Duplicate */}
        {(otherGalleries?.length ?? 0) > 0 && (
          <div className="border rounded p-3 space-y-2">
            <Label className="text-xs flex items-center gap-1"><Copy className="h-3 w-3" />Duplicar design de outra galeria</Label>
            <Select onValueChange={(id) => {
              const g = otherGalleries?.find((o) => o.id === id);
              if (g?.design_settings) { setDesign(mergeDesign(g.design_settings)); toast.success("Design copiado — ajuste e salve."); }
            }}>
              <SelectTrigger><SelectValue placeholder="Escolher galeria..." /></SelectTrigger>
              <SelectContent>
                {otherGalleries?.map((o) => <SelectItem key={o.id} value={o.id}>{o.couple_names}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* PREVIEW */}
      <div className="border rounded-lg bg-muted/30 overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-background flex-wrap">
          <p className="text-xs text-muted-foreground">
            Preview · {device}
            {compareMode === "split" && <span className="ml-2 text-primary font-medium">comparando</span>}
            {showingBefore && <span className="ml-2 text-primary font-medium">ANTES</span>}
          </p>
          <div className="flex items-center gap-2">
            {dirty && (
              <div className="flex gap-1 border-r pr-2">
                <Button size="sm" variant={compareMode === "split" ? "default" : "outline"} className="h-7 px-2 text-xs" onClick={() => { setCompareMode(compareMode === "split" ? "off" : "split"); setShowingBefore(false); }} title="Comparar lado a lado">
                  <SplitSquareHorizontal className="h-3.5 w-3.5 mr-1" />Split
                </Button>
                <Button
                  size="sm"
                  variant={showingBefore ? "default" : "outline"}
                  className="h-7 px-2 text-xs select-none"
                  onMouseDown={() => setShowingBefore(true)}
                  onMouseUp={() => setShowingBefore(false)}
                  onMouseLeave={() => setShowingBefore(false)}
                  onTouchStart={() => setShowingBefore(true)}
                  onTouchEnd={() => setShowingBefore(false)}
                  title="Segure para ver o antes"
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />Antes
                </Button>
              </div>
            )}
            <div className="flex gap-1">
              <Button size="icon" variant={device === "desktop" ? "default" : "ghost"} className="h-7 w-7" onClick={() => setDevice("desktop")}><Monitor className="h-3.5 w-3.5" /></Button>
              <Button size="icon" variant={device === "tablet" ? "default" : "ghost"} className="h-7 w-7" onClick={() => setDevice("tablet")}><Tablet className="h-3.5 w-3.5" /></Button>
              <Button size="icon" variant={device === "mobile" ? "default" : "ghost"} className="h-7 w-7" onClick={() => setDevice("mobile")}><Smartphone className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </div>
        <div className="overflow-auto" style={{ height: "calc(100vh - 220px)" }}>
          {compareMode === "split" ? (
            <div className="grid grid-cols-2 gap-2 p-2">
              <div className="bg-background shadow-xl overflow-hidden">
                <div className="text-[10px] uppercase tracking-wider text-center py-1 bg-muted text-muted-foreground border-b">Antes (salvo)</div>
                <GalleryRender gallery={gallery as any} files={(files ?? []) as any} urls={urls} design={initialDesign} embedded forceMobile />
              </div>
              <div className="bg-background shadow-xl overflow-hidden ring-2 ring-primary/40">
                <div className="text-[10px] uppercase tracking-wider text-center py-1 bg-primary/10 text-primary border-b">Depois (atual)</div>
                <GalleryRender gallery={gallery as any} files={(files ?? []) as any} urls={urls} design={design} embedded forceMobile />
              </div>
            </div>
          ) : (
            <div className="mx-auto bg-background shadow-2xl my-4 transition-all" style={{ width: previewWidth, maxWidth: "100%" }}>
              <GalleryRender
                gallery={gallery as any}
                files={(files ?? []) as any}
                urls={urls}
                design={showingBefore ? initialDesign : design}
                embedded
                forceMobile={device === "mobile"}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SliderRow({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between"><Label className="text-xs">{label}</Label><span className="text-xs text-muted-foreground tabular-nums">{value}</span></div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} className="mt-1.5" />
    </div>
  );
}

function SegRow({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="grid grid-cols-3 gap-1 mt-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0,1fr))` }}>
        {options.map((o) => (
          <button key={o} onClick={() => onChange(o)} className={`text-[11px] uppercase tracking-wider py-1.5 border rounded ${value === o ? "bg-foreground text-background border-foreground" : "border-border"}`}>{o}</button>
        ))}
      </div>
    </div>
  );
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label className="text-xs flex-1">{label}</Label>
      <Input type="text" value={value} onChange={(e) => onChange(e.target.value)} className="w-24 h-8 text-xs font-mono" />
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 rounded border cursor-pointer" />
    </div>
  );
}

function FontSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {FONT_OPTIONS.map((f) => <SelectItem key={f} value={f}><span style={{ fontFamily: f }}>{f}</span></SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
