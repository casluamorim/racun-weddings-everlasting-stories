import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const AdminStories = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", slug: "", city: "", venue: "", wedding_date: "", content: "", seo_title: "", seo_description: "" });

  const { data: stories, isLoading } = useQuery({
    queryKey: ["admin-stories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("stories").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { error } = await supabase.from("stories").insert({
        title: form.title,
        slug,
        city: form.city || null,
        venue: form.venue || null,
        wedding_date: form.wedding_date || null,
        content: form.content || null,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stories"] });
      toast.success("História criada!");
      setOpen(false);
      setForm({ title: "", slug: "", city: "", venue: "", wedding_date: "", content: "", seo_title: "", seo_description: "" });
    },
    onError: () => toast.error("Erro ao criar história"),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase.from("stories").update({ is_published: !is_published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-stories"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stories"] });
      toast.success("História removida");
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl text-foreground">Histórias</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus size={16} className="mr-1" /> Nova História</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading">Nova História</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
              <div>
                <Label className="font-body text-sm">Título *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <Label className="font-body text-sm">Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                <Label className="font-body text-sm">Data do Casamento</Label>
                <Input type="date" value={form.wedding_date} onChange={(e) => setForm({ ...form, wedding_date: e.target.value })} />
              </div>
              <div>
                <Label className="font-body text-sm">Conteúdo</Label>
                <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={6} />
              </div>
              <div>
                <Label className="font-body text-sm">SEO Título</Label>
                <Input value={form.seo_title} onChange={(e) => setForm({ ...form, seo_title: e.target.value })} />
              </div>
              <div>
                <Label className="font-body text-sm">SEO Descrição</Label>
                <Input value={form.seo_description} onChange={(e) => setForm({ ...form, seo_description: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>Criar História</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground font-body text-sm">Carregando...</p>
      ) : stories?.length === 0 ? (
        <p className="text-muted-foreground font-body text-sm">Nenhuma história criada.</p>
      ) : (
        <div className="space-y-3">
          {stories?.map((s) => (
            <div key={s.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="font-body text-sm font-medium text-foreground">{s.title}</p>
                <p className="font-body text-xs text-muted-foreground">{s.city}{s.wedding_date ? ` • ${new Date(s.wedding_date).toLocaleDateString("pt-BR")}` : ""}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => togglePublish.mutate({ id: s.id, is_published: s.is_published })}>
                  {s.is_published ? <Eye size={16} className="text-green-600" /> : <EyeOff size={16} />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(s.id)}>
                  <Trash2 size={16} className="text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminStories;
