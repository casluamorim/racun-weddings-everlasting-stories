import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Eye, EyeOff, Link as LinkIcon, Copy, Search } from "lucide-react";
import { slugify } from "@/lib/slug";

const AdminGalleries = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ couple_names: "", event_date: "", city: "", venue: "" });
  const [q, setQ] = useState("");

  const { data: galleries, isLoading } = useQuery({
    queryKey: ["admin-galleries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wedding_galleries")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const baseSlug = slugify(form.couple_names) || "galeria";
      // ensure unique slug
      let slug = baseSlug;
      const { data: existing } = await supabase.from("wedding_galleries").select("id").eq("slug", slug).maybeSingle();
      if (existing) slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase
        .from("wedding_galleries")
        .insert({
          couple_names: form.couple_names,
          event_date: form.event_date || null,
          city: form.city || null,
          venue: form.venue || null,
          slug,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-galleries"] });
      toast.success("Galeria criada!");
      setOpen(false);
      setForm({ couple_names: "", event_date: "", city: "", venue: "" });
    },
    onError: (e: any) => toast.error(e?.message || "Erro"),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase.from("wedding_galleries").update({ is_published: !is_published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-galleries"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // remove storage folder
      const { data: files } = await supabase.storage.from("galleries").list(id, { limit: 1000 });
      // recursive cleanup
      const removeFolder = async (prefix: string) => {
        const { data } = await supabase.storage.from("galleries").list(prefix, { limit: 1000 });
        if (!data) return;
        const toRemove: string[] = [];
        for (const item of data) {
          if (item.id === null) await removeFolder(`${prefix}/${item.name}`);
          else toRemove.push(`${prefix}/${item.name}`);
        }
        if (toRemove.length) await supabase.storage.from("galleries").remove(toRemove);
      };
      await removeFolder(id);
      const { error } = await supabase.from("wedding_galleries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-galleries"] });
      toast.success("Galeria removida");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao remover"),
  });

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/galeria/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const filtered = (galleries ?? []).filter((g) => {
    const s = q.toLowerCase();
    return (
      !s ||
      g.couple_names.toLowerCase().includes(s) ||
      (g.city ?? "").toLowerCase().includes(s) ||
      g.slug.toLowerCase().includes(s)
    );
  });

  const expiryStatus = (g: any): { label: string; tone: "ok" | "warn" | "removed" } => {
    if (g.originals_removed_at) return { label: "Originais removidos", tone: "removed" };
    if (g.keep_originals_forever) return { label: "Mantidos permanentemente", tone: "ok" };
    if (!g.originals_expire_at) return { label: "Originais ativos", tone: "ok" };
    const days = Math.ceil((new Date(g.originals_expire_at).getTime() - Date.now()) / 86_400_000);
    if (days <= 0) return { label: "Expirado", tone: "warn" };
    if (days <= 30) return { label: `Expira em ${days}d`, tone: "warn" };
    return { label: `Ativo (${days}d)`, tone: "ok" };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-heading">Galerias de Casamentos</h1>
          <p className="text-muted-foreground font-body text-sm">Entrega premium para os casais (link privado sem login).</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nova galeria</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Criar galeria</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Nome do casal *</Label><Input value={form.couple_names} onChange={(e) => setForm({ ...form, couple_names: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Data</Label><Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></div>
                <div><Label>Cidade</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              </div>
              <div><Label>Local</Label><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
              <Button onClick={() => createMutation.mutate()} disabled={!form.couple_names || createMutation.isPending} className="w-full">Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por casal, cidade ou slug..." className="pl-8" />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">Nenhuma galeria.</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((g) => {
            const st = expiryStatus(g);
            return (
              <div key={g.id} className="border border-border rounded-lg p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link to={`/admin/galleries/${g.id}`} className="font-heading text-lg hover:text-primary">{g.couple_names}</Link>
                    {g.is_published ? <Badge variant="default">Publicada</Badge> : <Badge variant="secondary">Rascunho</Badge>}
                    <Badge variant={st.tone === "ok" ? "outline" : st.tone === "warn" ? "default" : "destructive"}>{st.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground font-body mt-1 truncate">
                    {g.event_date ? new Date(g.event_date).toLocaleDateString("pt-BR") : "sem data"} · {g.city || "—"} · /{g.slug}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => copyLink(g.slug, g.access_token)} title="Copiar link privado">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.open(`/galeria/${g.slug}?token=${g.access_token}`, "_blank")} title="Abrir">
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => togglePublish.mutate({ id: g.id, is_published: g.is_published })}>
                    {g.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { if (confirm("Excluir galeria e todos arquivos?")) deleteMutation.mutate(g.id); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminGalleries;
