import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Link2,
  Pencil,
  FileText,
  Film,
  ImageIcon,
  X,
  Check,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { slugify } from "@/lib/slug";

const SITE_URL = "https://weddings.agenciaracun.com";

type ProposalItem = { name: string; price: string; description: string; features: string[] };

type FormState = {
  id: string | null;
  couple_names: string;
  slug: string;
  slugTouched: boolean;
  event_date: string;
  city: string;
  venue: string;
  intro: string;
  notes: string;
  valid_until: string;
  discount: string;
  items: ProposalItem[];
  photos: string[];
  videos: string[];
  is_published: boolean;
};

const emptyForm = (): FormState => ({
  id: null,
  couple_names: "",
  slug: "",
  slugTouched: false,
  event_date: "",
  city: "",
  venue: "",
  intro: "",
  notes: "",
  valid_until: "",
  discount: "0",
  items: [],
  photos: [],
  videos: [],
  is_published: false,
});

const getYouTubeId = (url: string) =>
  url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]+)/)?.[1] ?? "";

const statusOf = (p: any) => {
  if (p.status === "aprovado") return { label: "Aprovado", cls: "text-green-600" };
  if (!p.is_published) return { label: "Rascunho", cls: "text-muted-foreground" };
  if (p.valid_until && new Date(`${p.valid_until}T23:59:59`) < new Date())
    return { label: "Expirado", cls: "text-destructive" };
  return { label: "Enviado", cls: "text-primary" };
};

const AdminProposals = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const { data: proposals, isLoading } = useQuery({
    queryKey: ["admin-proposals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: mediaLib } = useQuery({
    queryKey: ["admin-proposal-media-lib"],
    queryFn: async () => {
      const [photos, videos] = await Promise.all([
        supabase
          .from("portfolio_photos")
          .select("id, photo_url, caption, category")
          .order("home_sort_order"),
        supabase
          .from("portfolio_videos")
          .select("id, youtube_url, title, category")
          .order("home_sort_order"),
      ]);
      if (photos.error) throw photos.error;
      if (videos.error) throw videos.error;
      return { photos: photos.data ?? [], videos: videos.data ?? [] };
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["admin-proposal-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_plans")
        .select("id, category, display_name, name, price, features, is_active, sort_order")
        .eq("is_active", true)
        .order("category")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const planToItem = (p: any): ProposalItem => ({
    name: `${p.display_name || p.name}${p.category ? ` (${p.category})` : ""}`,
    price: p.price ?? "",
    description: "",
    features: Array.isArray(p.features) ? p.features : [],
  });

  const addPlan = (p: any) =>
    setForm((f) => ({ ...f, items: [...f.items, planToItem(p)] }));


  const slugPreview = useMemo(
    () => (form.slugTouched ? slugify(form.slug) : slugify(form.couple_names)),
    [form.slug, form.couple_names, form.slugTouched]
  );

  const computeStatus = (isPublished: boolean, validUntil?: string | null) => {
    if (!isPublished) return "rascunho";
    if (validUntil && new Date(`${validUntil}T23:59:59`) < new Date()) return "expirado";
    return "enviado";
  };

  const save = useMutation({
    mutationFn: async () => {
      const slug = slugPreview;
      if (!slug) throw new Error("Informe o nome do casal");
      const dup = (proposals ?? []).find((p: any) => p.slug === slug && p.id !== form.id);
      if (dup) throw new Error("Já existe um orçamento com esse link (slug)");

      const status = computeStatus(form.is_published, form.valid_until);
      const payload = {
        couple_names: form.couple_names,
        slug,
        event_date: form.event_date || null,
        city: form.city || null,
        venue: form.venue || null,
        intro: form.intro || null,
        notes: form.notes || null,
        valid_until: form.valid_until || null,
        discount: Number(form.discount.replace(",", ".")) || 0,
        items: form.items as any,
        media: { photos: form.photos, videos: form.videos } as any,
        is_published: form.is_published,
        ativo: form.is_published,
        status,
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
      toast.success("Orçamento salvo!");
      setOpen(false);
      setForm(emptyForm());
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar orçamento"),
  });

  const togglePublish = useMutation({
    mutationFn: async (p: any) => {
      const next = !p.is_published;
      const status = computeStatus(next, p.valid_until);
      const { error } = await supabase
        .from("proposals")
        .update({ is_published: next, ativo: next, status })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-proposals"] }),
    onError: (e: any) => toast.error(e?.message || "Erro ao atualizar"),
  });

  const markApproved = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("proposals").update({ status: "aprovado" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-proposals"] });
      toast.success("Orçamento marcado como aprovado");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao atualizar"),
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

  const startEdit = (p: any) => {
    const media = (p.media ?? {}) as { photos?: string[]; videos?: string[] };
    setForm({
      id: p.id,
      couple_names: p.couple_names ?? "",
      slug: p.slug ?? "",
      slugTouched: true,
      event_date: p.event_date ?? "",
      city: p.city ?? "",
      venue: p.venue ?? "",
      intro: p.intro ?? "",
      notes: p.notes ?? "",
      valid_until: p.valid_until ?? "",
      discount: String(p.discount ?? 0),
      items: (Array.isArray(p.items) ? p.items : []).map((i: any) => ({
        name: i.name ?? "",
        price: i.price ?? "",
        description: i.description ?? "",
        features: Array.isArray(i.features) ? i.features : [],
      })),
      photos: media.photos ?? [],
      videos: media.videos ?? [],
      is_published: !!p.is_published,
    });
    setOpen(true);
  };

  const copyLink = async (slug: string) => {
    await navigator.clipboard.writeText(`${SITE_URL}/orcamento/${slug}`);
    toast.success("Link copiado!");
  };

  const toggleId = (list: string[], id: string) =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const updateItem = (index: number, patch: Partial<ProposalItem>) =>
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    }));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-heading text-2xl text-foreground flex items-center gap-2">
          <FileText size={20} /> Orçamentos
        </h1>
        <Button
          onClick={() => {
            setForm(emptyForm());
            setOpen(true);
          }}
        >
          <Plus size={16} className="mr-1" /> Novo orçamento
        </Button>
      </div>
      <p className="font-body text-sm text-muted-foreground mb-6">
        Cada casal tem uma página exclusiva em {SITE_URL}/orcamento/nome-do-casal.
      </p>

      {isLoading ? (
        <p className="font-body text-sm text-muted-foreground">Carregando...</p>
      ) : !proposals?.length ? (
        <p className="font-body text-sm text-muted-foreground">Nenhum orçamento criado ainda.</p>
      ) : (
        <div className="space-y-3">
          {proposals.map((p: any) => {
            const st = statusOf(p);
            return (
              <div
                key={p.id}
                className="bg-card border border-border rounded-lg p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-body text-sm font-medium text-foreground truncate">
                    {p.couple_names}
                  </p>
                  <p className="font-body text-xs text-muted-foreground truncate">
                    /orcamento/{p.slug}
                    {p.valid_until
                      ? ` • válido até ${new Date(`${p.valid_until}T12:00:00`).toLocaleDateString("pt-BR")}`
                      : ""}
                    {` • ${p.view_count ?? 0} visualizações`}
                  </p>
                  <p className={`font-body text-xs mt-0.5 ${st.cls}`}>{st.label}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" title="Copiar link" onClick={() => copyLink(p.slug)}>
                    <Link2 size={16} />
                  </Button>
                  <Button variant="ghost" size="icon" title="Editar" onClick={() => startEdit(p)}>
                    <Pencil size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={p.is_published ? "Desativar" : "Ativar"}
                    onClick={() => togglePublish.mutate(p)}
                  >
                    {p.is_published ? <Eye size={16} className="text-green-600" /> : <EyeOff size={16} />}
                  </Button>
                  {p.status !== "aprovado" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Marcar como aprovado"
                      onClick={() => markApproved.mutate(p.id)}
                    >
                      <Check size={16} className="text-green-600" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" title="Excluir" onClick={() => remove.mutate(p.id)}>
                    <Trash2 size={16} className="text-destructive" />
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
              {form.id ? "Editar orçamento" : "Novo orçamento"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
            className="space-y-5"
          >
            <div>
              <Label className="font-body text-sm">Nome do casal *</Label>
              <Input
                value={form.couple_names}
                onChange={(e) => setForm({ ...form, couple_names: e.target.value })}
                placeholder="João e Maria"
                required
              />
            </div>

            <div>
              <Label className="font-body text-sm">Link (slug)</Label>
              <Input
                value={form.slugTouched ? form.slug : slugPreview}
                onChange={(e) => setForm({ ...form, slug: e.target.value, slugTouched: true })}
              />
              <p className="font-body text-xs text-muted-foreground mt-1">
                {SITE_URL}/orcamento/{slugPreview || "nome-do-casal"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
              <Label className="font-body text-sm">Texto de abertura</Label>
              <Textarea
                rows={3}
                value={form.intro}
                onChange={(e) => setForm({ ...form, intro: e.target.value })}
                placeholder="Mensagem personalizada para o casal..."
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <Label className="font-body text-sm">Pacotes</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      items: [...form.items, { name: "", price: "", description: "", features: [] }],
                    })
                  }
                >
                  <Plus size={14} className="mr-1" /> Pacote em branco
                </Button>
              </div>
              {!!plans?.length && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {plans.map((p: any) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addPlan(p)}
                      className="font-body text-xs border border-border rounded-full px-3 py-1 hover:bg-accent text-muted-foreground"
                    >
                      + {p.display_name || p.name} · {p.price}
                    </button>
                  ))}
                </div>
              )}
              <div className="space-y-3">
                {form.items.map((item, i) => (
                  <div key={i} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(i, { name: e.target.value })}
                        placeholder="Nome do pacote"
                      />
                      <Input
                        value={item.price}
                        onChange={(e) => updateItem(i, { price: e.target.value })}
                        placeholder="R$ 5.900"
                        className="w-32"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setForm({ ...form, items: form.items.filter((_, x) => x !== i) })
                        }
                      >
                        <X size={16} className="text-destructive" />
                      </Button>
                    </div>
                    <Textarea
                      rows={2}
                      value={item.description}
                      onChange={(e) => updateItem(i, { description: e.target.value })}
                      placeholder="Descrição do pacote"
                    />
                    <Textarea
                      rows={3}
                      value={item.features.join("\n")}
                      onChange={(e) =>
                        updateItem(i, {
                          features: e.target.value.split("\n").filter((l) => l.trim()),
                        })
                      }
                      placeholder="Itens inclusos (um por linha)"
                    />
                  </div>
                ))}
                {form.items.length === 0 && (
                  <p className="font-body text-xs text-muted-foreground">
                    Nenhum pacote adicionado.
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label className="font-body text-sm">Desconto (R$)</Label>
              <Input
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: e.target.value })}
                className="w-32"
              />
            </div>

            <div>
              <Label className="font-body text-sm flex items-center gap-1 mb-2">
                <ImageIcon size={14} /> Fotos ({form.photos.length} selecionadas)
              </Label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-56 overflow-y-auto p-1">
                {(mediaLib?.photos ?? []).map((p: any) => {
                  const active = form.photos.includes(p.id);
                  return (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setForm({ ...form, photos: toggleId(form.photos, p.id) })}
                      className={`relative rounded overflow-hidden border-2 ${
                        active ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <img src={p.photo_url} alt="" className="w-full aspect-square object-cover bg-muted" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="font-body text-sm flex items-center gap-1 mb-2">
                <Film size={14} /> Vídeos ({form.videos.length} selecionados)
              </Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-56 overflow-y-auto p-1">
                {(mediaLib?.videos ?? []).map((v: any) => {
                  const active = form.videos.includes(v.id);
                  return (
                    <button
                      type="button"
                      key={v.id}
                      onClick={() => setForm({ ...form, videos: toggleId(form.videos, v.id) })}
                      className={`relative rounded overflow-hidden border-2 ${
                        active ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <img
                        src={`https://img.youtube.com/vi/${getYouTubeId(v.youtube_url)}/mqdefault.jpg`}
                        alt=""
                        className="w-full aspect-video object-cover bg-muted"
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="font-body text-sm">Observações</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Formas de pagamento, prazos de entrega..."
              />
            </div>

            <label className="flex items-center gap-2 font-body text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
              />
              Ativo (visível pelo link)
            </label>

            <Button type="submit" className="w-full" disabled={save.isPending}>
              Salvar orçamento
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProposals;
