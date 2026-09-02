import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Copy, Trash2, Pencil, ExternalLink, Eye } from "lucide-react";
import { slugify } from "@/lib/slug";

const SITE_URL = "https://weddings.agenciaracun.com";

type Item = { name: string; description?: string; price: number };
type Media = { kind: "photo" | "video"; url: string; title?: string };

type Proposal = {
  id: string;
  slug: string;
  couple_names: string;
  event_date: string | null;
  city: string | null;
  venue: string | null;
  intro: string | null;
  notes: string | null;
  items: Item[];
  discount: number;
  valid_until: string | null;
  media: Media[];
  is_published: boolean;
  view_count: number;
};

const parsePrice = (raw?: string | null): number => {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d,.-]/g, "");
  if (!cleaned) return 0;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(/\.(?=\d{3}(\D|$))/g, "");
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
};

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const getYouTubeId = (url: string) =>
  url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]+)/)?.[1] ?? "";

const emptyForm = {
  id: "",
  couple_names: "",
  slug: "",
  event_date: "",
  city: "",
  venue: "",
  intro: "",
  notes: "",
  items: [] as Item[],
  discount: "",
  valid_until: "",
  media: [] as Media[],
  is_published: true,
};

const AdminProposals = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");

  const { data: proposals, isLoading } = useQuery({
    queryKey: ["admin-proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Proposal[];
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["admin-pricing-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_plans")
        .select("*")
        .eq("is_active", true)
        .order("category")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: mediaLibrary } = useQuery({
    queryKey: ["admin-proposal-media"],
    queryFn: async (): Promise<Media[]> => {
      const [{ data: photos }, { data: videos }] = await Promise.all([
        supabase.from("portfolio_photos").select("id, photo_url, caption").order("created_at", { ascending: false }).limit(200),
        supabase.from("portfolio_videos").select("id, youtube_url, title").order("created_at", { ascending: false }).limit(100),
      ]);
      return [
        ...((photos || []) as any[]).map((p) => ({ kind: "photo" as const, url: p.photo_url, title: p.caption || "" })),
        ...((videos || []) as any[]).map((v) => ({ kind: "video" as const, url: v.youtube_url, title: v.title || "" })),
      ];
    },
  });

  const itemsTotal = form.items.reduce((s, i) => s + (i.price || 0), 0);
  const total = Math.max(0, itemsTotal - (parsePrice(form.discount) || 0));

  const togglePlanItem = (plan: any) => {
    setForm((f) => {
      const exists = f.items.some((i) => i.name === plan.display_name);
      return {
        ...f,
        items: exists
          ? f.items.filter((i) => i.name !== plan.display_name)
          : [
              ...f.items,
              {
                name: plan.display_name,
                description: (plan.features || []).join(" • "),
                price: parsePrice(plan.price),
              },
            ],
      };
    });
  };

  const toggleMedia = (m: Media) => {
    setForm((f) => ({
      ...f,
      media: f.media.some((x) => x.url === m.url)
        ? f.media.filter((x) => x.url !== m.url)
        : [...f.media, m],
    }));
  };

  const save = useMutation({
    mutationFn: async () => {
      const baseSlug = slugify(form.slug || form.couple_names);
      if (!baseSlug) throw new Error("slug inválido");

      const payload = {
        couple_names: form.couple_names,
        slug: baseSlug,
        event_date: form.event_date || null,
        city: form.city || null,
        venue: form.venue || null,
        intro: form.intro || null,
        notes: form.notes || null,
        items: form.items as any,
        discount: parsePrice(form.discount) || 0,
        valid_until: form.valid_until || null,
        media: form.media as any,
        is_published: form.is_published,
      };

      if (form.id) {
        const { error } = await supabase.from("proposals").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("proposals").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-proposals"] });
      toast.success(form.id ? "Orçamento atualizado!" : "Orçamento criado!");
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e: any) =>
      toast.error(
        e?.message?.includes("duplicate") ? "Já existe um orçamento com esse link" : "Erro ao salvar orçamento"
      ),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("proposals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-proposals"] });
      toast.success("Orçamento removido");
    },
  });

  const togglePublish = useMutation({
    mutationFn: async (p: Proposal) => {
      const { error } = await supabase
        .from("proposals")
        .update({ is_published: !p.is_published })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-proposals"] }),
  });

  const startEdit = (p: Proposal) => {
    setForm({
      id: p.id,
      couple_names: p.couple_names,
      slug: p.slug,
      event_date: p.event_date ?? "",
      city: p.city ?? "",
      venue: p.venue ?? "",
      intro: p.intro ?? "",
      notes: p.notes ?? "",
      items: Array.isArray(p.items) ? p.items : [],
      discount: p.discount ? String(p.discount) : "",
      valid_until: p.valid_until ?? "",
      media: Array.isArray(p.media) ? p.media : [],
      is_published: p.is_published,
    });
    setOpen(true);
  };

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${SITE_URL}/orcamento/${slug}`);
    toast.success("Link copiado!");
  };

  const groupedPlans = useMemo(() => {
    const groups: Record<string, any[]> = { foto: [], video: [], combo: [] };
    (plans || []).forEach((p: any) => {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    return groups;
  }, [plans]);

  const categoryLabels: Record<string, string> = { foto: "Fotografia", video: "Vídeo", combo: "Combos" };

  const filtered = (proposals || []).filter(
    (p) => !search || p.couple_names.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="font-heading text-2xl text-foreground">Orçamentos Personalizados</h1>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setOpen(true);
          }}
        >
          <Plus size={16} className="mr-1" /> Novo Orçamento
        </Button>
      </div>

      <Input
        placeholder="Buscar por casal ou link..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-xs mb-6"
      />

      {isLoading ? (
        <p className="font-body text-sm text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground">Nenhum orçamento criado ainda.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => {
            const t = (Array.isArray(p.items) ? p.items : []).reduce((s, i) => s + (i.price || 0), 0) - (p.discount || 0);
            return (
              <div key={p.id} className="bg-card border border-border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm font-medium text-foreground">{p.couple_names}</p>
                  <p className="font-body text-xs text-muted-foreground truncate">/orcamento/{p.slug}</p>
                  <p className="font-body text-xs text-primary mt-1">
                    {formatBRL(Math.max(0, t))} • {(Array.isArray(p.media) ? p.media.length : 0)} mídias •{" "}
                    <span className="text-muted-foreground">
                      <Eye size={11} className="inline mr-0.5" />
                      {p.view_count}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={p.is_published} onCheckedChange={() => togglePublish.mutate(p)} />
                  <Button size="sm" variant="outline" onClick={() => copyLink(p.slug)}>
                    <Copy size={14} />
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/orcamento/${p.slug}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink size={14} />
                    </a>
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => startEdit(p)}>
                    <Pencil size={14} />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm(`Remover o orçamento de ${p.couple_names}?`)) remove.mutate(p.id);
                    }}
                  >
                    <Trash2 size={14} className="text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {form.id ? "Editar Orçamento" : "Novo Orçamento"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="font-body text-sm">Nome do casal *</Label>
                <Input
                  value={form.couple_names}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      couple_names: e.target.value,
                      slug: f.id ? f.slug : slugify(e.target.value),
                    }))
                  }
                  required
                />
              </div>
              <div>
                <Label className="font-body text-sm">Link</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="nomecasal"
                />
                <p className="font-body text-[11px] text-muted-foreground mt-1 truncate">
                  {SITE_URL}/orcamento/{slugify(form.slug || form.couple_names) || "..."}
                </p>
              </div>
              <div>
                <Label className="font-body text-sm">Data do casamento</Label>
                <Input
                  type="date"
                  value={form.event_date}
                  onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                />
              </div>
              <div>
                <Label className="font-body text-sm">Válido até</Label>
                <Input
                  type="date"
                  value={form.valid_until}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                />
              </div>
              <div>
                <Label className="font-body text-sm">Cidade</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label className="font-body text-sm">Local</Label>
                <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
              </div>
            </div>

            <div>
              <Label className="font-body text-sm">Mensagem de abertura</Label>
              <Textarea
                rows={3}
                value={form.intro}
                onChange={(e) => setForm({ ...form, intro: e.target.value })}
                placeholder="Que alegria fazer parte do dia de vocês..."
              />
            </div>

            <div>
              <Label className="font-body text-sm mb-2 block">Planos incluídos</Label>
              <div className="border border-input rounded-md p-3 space-y-3 bg-background max-h-56 overflow-y-auto">
                {Object.entries(groupedPlans).map(([cat, list]) =>
                  list.length ? (
                    <div key={cat}>
                      <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                        {categoryLabels[cat]}
                      </p>
                      <div className="space-y-1.5">
                        {list.map((p: any) => (
                          <label key={p.id} className="flex items-center gap-2 text-sm font-body cursor-pointer px-1 py-0.5 rounded hover:bg-accent/40">
                            <Checkbox
                              checked={form.items.some((i) => i.name === p.display_name)}
                              onCheckedChange={() => togglePlanItem(p)}
                            />
                            <span className="flex-1 text-foreground">{p.display_name}</span>
                            <span className="text-primary text-xs">{p.price}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            </div>

            <div>
              <Label className="font-body text-sm mb-2 block">Itens do orçamento</Label>
              <div className="space-y-2">
                {form.items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr,110px,32px] gap-2 items-center">
                    <Input
                      value={it.name}
                      onChange={(e) => {
                        const items = [...form.items];
                        items[idx] = { ...it, name: e.target.value };
                        setForm({ ...form, items });
                      }}
                      placeholder="Item"
                    />
                    <Input
                      value={String(it.price ?? "")}
                      onChange={(e) => {
                        const items = [...form.items];
                        items[idx] = { ...it, price: parsePrice(e.target.value) };
                        setForm({ ...form, items });
                      }}
                      placeholder="0"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })}
                    >
                      <Trash2 size={14} className="text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setForm({ ...form, items: [...form.items, { name: "", price: 0 }] })}
                >
                  <Plus size={14} className="mr-1" /> Adicionar item
                </Button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 items-end">
              <div>
                <Label className="font-body text-sm">Desconto (R$)</Label>
                <Input value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} placeholder="0" />
              </div>
              <div className="bg-primary/10 rounded-md px-3 py-2 flex items-center justify-between">
                <span className="font-body text-xs text-foreground">Total</span>
                <span className="font-heading text-lg text-primary">{formatBRL(total)}</span>
              </div>
            </div>

            <div>
              <Label className="font-body text-sm mb-2 block">
                Fotos e vídeos ({form.media.length} selecionados)
              </Label>
              <div className="border border-input rounded-md p-2 bg-background max-h-64 overflow-y-auto grid grid-cols-3 sm:grid-cols-5 gap-2">
                {(mediaLibrary || []).map((m) => {
                  const selected = form.media.some((x) => x.url === m.url);
                  const thumb =
                    m.kind === "photo" ? m.url : `https://img.youtube.com/vi/${getYouTubeId(m.url)}/mqdefault.jpg`;
                  return (
                    <button
                      type="button"
                      key={m.url}
                      onClick={() => toggleMedia(m)}
                      className={`relative aspect-square overflow-hidden rounded border-2 transition-all ${
                        selected ? "border-primary ring-2 ring-primary/40" : "border-transparent opacity-80 hover:opacity-100"
                      }`}
                    >
                      <img src={thumb} alt={m.title || "mídia"} loading="lazy" className="w-full h-full object-cover" />
                      {m.kind === "video" && (
                        <span className="absolute bottom-1 right-1 text-[9px] bg-background/80 px-1 rounded font-body">
                          vídeo
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="font-body text-sm">Observações</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Formas de pagamento, prazos..."
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_published}
                onCheckedChange={(v) => setForm({ ...form, is_published: v })}
              />
              <span className="font-body text-sm text-muted-foreground">Link ativo</span>
            </div>

            <Button type="submit" className="w-full" disabled={save.isPending}>
              {form.id ? "Salvar alterações" : "Criar orçamento"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProposals;
