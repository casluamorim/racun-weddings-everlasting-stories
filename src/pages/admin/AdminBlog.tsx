import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Plus, Trash2, Eye, EyeOff, ImagePlus, Loader2, Sparkles, RefreshCw, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type BatchFailure = { id: string; title: string; error: string };

const AdminBlog = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
    seo_title: "",
    seo_description: "",
    category: "fotografia",
    tags: "",
  });
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [batch, setBatch] = useState<{ running: boolean; total: number; done: number; current: string } | null>(null);
  const [failures, setFailures] = useState<BatchFailure[]>([]);

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-blog"],
    queryFn: async () => {
      const { data, error } = await supabase.from("blog_posts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: metrics } = useQuery({
    queryKey: ["admin-blog-metrics"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("blog_events")
        .select("event_type,value,post_slug")
        .gte("created_at", since)
        .limit(10000);
      if (error) throw error;
      return data;
    },
  });

  const metricSummary = useMemo(() => {
    const events = metrics ?? [];
    const pageviews = events.filter((e) => e.event_type === "pageview").length;
    const whatsapp = events.filter((e) => e.event_type === "whatsapp_cta").length;
    const ctas = events.filter((e) => e.event_type === "cta_click").length;
    const deepScroll = events.filter((e) => e.event_type === "scroll" && (e.value ?? 0) >= 75).length;
    const conversion = pageviews ? (((whatsapp + ctas) / pageviews) * 100).toFixed(1) : "0.0";
    return { pageviews, whatsapp, ctas, deepScroll, conversion };
  }, [metrics]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const slug = form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { error } = await supabase.from("blog_posts").insert({
        title: form.title,
        slug,
        excerpt: form.excerpt || null,
        content: form.content || null,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
        category: form.category || "geral",
        tags: form.tags
          .split(",")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
      toast.success("Post criado!");
      setOpen(false);
      setForm({ title: "", slug: "", excerpt: "", content: "", seo_title: "", seo_description: "", category: "fotografia", tags: "" });
    },
    onError: () => toast.error("Erro ao criar post"),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const updates: Record<string, any> = { is_published: !is_published };
      if (!is_published) updates.published_at = new Date().toISOString();
      const { error } = await supabase.from("blog_posts").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-blog"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
      toast.success("Post removido");
    },
  });

  /** Generates one cover. Throws on failure so the batch can register it. */
  const runCover = async (postId: string, title: string) => {
    const { data, error } = await supabase.functions.invoke("generate-blog-cover", {
      body: { postId, title },
    });
    if (error) throw new Error(error.message || "Falha na função de geração");
    if (data?.error) throw new Error(data.error);
  };

  const generateCover = async (postId: string, title: string) => {
    setGeneratingIds((prev) => new Set(prev).add(postId));
    try {
      await runCover(postId, title);
      toast.success("Capa gerada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
      setFailures((prev) => prev.filter((f) => f.id !== postId));
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar capa");
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(postId);
        return next;
      });
    }
  };

  const runBatch = async (targets: { id: string; title: string }[]) => {
    if (!targets.length) {
      toast.info("Nenhum post pendente de capa.");
      return;
    }
    setFailures([]);
    setBatch({ running: true, total: targets.length, done: 0, current: targets[0].title });
    const newFailures: BatchFailure[] = [];

    for (let i = 0; i < targets.length; i++) {
      const post = targets[i];
      setBatch({ running: true, total: targets.length, done: i, current: post.title });
      try {
        await runCover(post.id, post.title);
      } catch (e: any) {
        newFailures.push({ id: post.id, title: post.title, error: e.message || "Erro desconhecido" });
      }
      queryClient.invalidateQueries({ queryKey: ["admin-blog"] });
      if (i < targets.length - 1) await new Promise((r) => setTimeout(r, 1500));
    }

    setBatch(null);
    setFailures(newFailures);
    const ok = targets.length - newFailures.length;
    if (newFailures.length) {
      toast.error(`${ok} capas geradas, ${newFailures.length} falharam. Você pode reprocessar as falhas.`);
    } else {
      toast.success(`Concluído: ${ok} capas geradas.`);
    }
  };

  const pending = useMemo(
    () => (posts ?? []).filter((p) => !p.cover_image_url).map((p) => ({ id: p.id, title: p.title })),
    [posts]
  );

  const progressPct = batch ? Math.round((batch.done / batch.total) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="font-heading text-2xl text-foreground">Blog</h1>
        <div className="flex gap-2">
          {pending.length > 0 && (
            <Button variant="outline" onClick={() => runBatch(pending)} disabled={!!batch?.running}>
              {batch?.running ? (
                <Loader2 size={16} className="mr-1 animate-spin" />
              ) : (
                <Sparkles size={16} className="mr-1" />
              )}
              Gerar {pending.length} capas com IA
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus size={16} className="mr-1" /> Novo Post</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-heading">Novo Post</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
                <div>
                  <Label className="font-body text-sm">Título *</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div>
                  <Label className="font-body text-sm">Slug (auto-gerado se vazio)</Label>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
                </div>
                <div>
                  <Label className="font-body text-sm">Categoria</Label>
                  <Input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="fotografia, video, locais, planejamento, entrega, tendencias"
                  />
                </div>
                <div>
                  <Label className="font-body text-sm">Tags (separadas por vírgula)</Label>
                  <Input
                    value={form.tags}
                    onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    placeholder="dicas, blumenau, vídeo"
                  />
                </div>
                <div>
                  <Label className="font-body text-sm">Resumo</Label>
                  <Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={2} />
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
                <Button type="submit" className="w-full" disabled={createMutation.isPending}>Criar Post</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Métricas do blog */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        {[
          { label: "Pageviews (30d)", value: metricSummary.pageviews },
          { label: "Leituras 75%+", value: metricSummary.deepScroll },
          { label: "Cliques WhatsApp", value: metricSummary.whatsapp },
          { label: "Cliques orçamento", value: metricSummary.ctas },
          { label: "Conversão", value: `${metricSummary.conversion}%` },
        ].map((m) => (
          <div key={m.label} className="rounded-lg border border-border bg-card p-4">
            <p className="font-body text-xs text-muted-foreground">{m.label}</p>
            <p className="font-heading text-2xl text-foreground">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Progresso do lote */}
      {batch && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <div className="mb-2 flex items-center justify-between font-body text-sm">
            <span className="text-foreground">Gerando capas... {batch.done}/{batch.total}</span>
            <span className="text-muted-foreground truncate max-w-[50%]">{batch.current}</span>
          </div>
          <Progress value={progressPct} />
        </div>
      )}

      {/* Falhas reprocessáveis */}
      {!batch && failures.length > 0 && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="inline-flex items-center gap-2 font-body text-sm text-foreground">
              <AlertTriangle size={16} className="text-destructive" />
              {failures.length} {failures.length === 1 ? "capa falhou" : "capas falharam"}
            </p>
            <Button size="sm" variant="outline" onClick={() => runBatch(failures.map((f) => ({ id: f.id, title: f.title })))}>
              <RefreshCw size={14} className="mr-1" /> Reprocessar falhas
            </Button>
          </div>
          <ul className="space-y-1 font-body text-xs text-muted-foreground">
            {failures.map((f) => (
              <li key={f.id}>• {f.title} — {f.error}</li>
            ))}
          </ul>
        </div>
      )}

      {isLoading ? (
        <p className="text-muted-foreground font-body text-sm">Carregando...</p>
      ) : posts?.length === 0 ? (
        <p className="text-muted-foreground font-body text-sm">Nenhum post criado.</p>
      ) : (
        <div className="space-y-3">
          {posts?.map((p) => (
            <div key={p.id} className="bg-card border border-border rounded-lg p-4 flex items-center gap-4">
              {/* Thumbnail */}
              <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                {p.cover_image_url ? (
                  <img src={p.cover_image_url} alt={p.title} className="w-full h-full object-cover" />
                ) : (
                  <ImagePlus size={20} className="text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body text-sm font-medium text-foreground truncate">{p.title}</p>
                <p className="font-body text-xs text-muted-foreground">
                  /{p.slug} · {p.category}
                  {p.tags?.length ? ` · ${p.tags.join(", ")}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {!p.cover_image_url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => generateCover(p.id, p.title)}
                    disabled={generatingIds.has(p.id) || !!batch?.running}
                    title="Gerar capa com IA"
                  >
                    {generatingIds.has(p.id) ? (
                      <Loader2 size={16} className="animate-spin text-primary" />
                    ) : (
                      <Sparkles size={16} className="text-primary" />
                    )}
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => togglePublish.mutate({ id: p.id, is_published: p.is_published })}>
                  {p.is_published ? <Eye size={16} className="text-green-600" /> : <EyeOff size={16} />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)}>
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

export default AdminBlog;
