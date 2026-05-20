import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Eye, EyeOff, Upload, ImageIcon, ChevronDown, ChevronUp, X, Film, Pencil, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SortableGrid } from "@/components/admin/SortablePhotoGrid";
import { compressImage } from "@/lib/imageCompression";
import { slugify } from "@/lib/slug";

const AdminWeddings = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingStandalone, setUploadingStandalone] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [standaloneYoutubeUrl, setStandaloneYoutubeUrl] = useState("");
  const [standaloneVideoTitle, setStandaloneVideoTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [form, setForm] = useState({ couple_names: "", city: "", venue: "", date: "", description: "" });
  const [editForm, setEditForm] = useState<{ couple_names: string; city: string; venue: string; date: string; description: string; style: string } | null>(null);
  const [editingWeddingId, setEditingWeddingId] = useState<string | null>(null);

  const { data: weddings, isLoading } = useQuery({
    queryKey: ["admin-weddings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("weddings").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: photos } = useQuery({
    queryKey: ["admin-photos", expandedId],
    enabled: !!expandedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_photos")
        .select("*")
        .eq("wedding_id", expandedId!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: weddingVideos } = useQuery({
    queryKey: ["admin-wedding-videos", expandedId],
    enabled: !!expandedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_videos")
        .select("*")
        .eq("wedding_id", expandedId!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: weddingTestimonial } = useQuery({
    queryKey: ["admin-wedding-testimonial", expandedId],
    enabled: !!expandedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("testimonials")
        .select("*")
        .eq("wedding_id", expandedId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const baseSlug = slugify(form.couple_names) || "casamento";
      const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;
      const { error } = await supabase.from("weddings").insert({
        couple_names: form.couple_names,
        city: form.city || null,
        venue: form.venue || null,
        date: form.date || null,
        description: form.description || null,
        slug,
        is_published: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-weddings"] });
      toast.success("Casamento cadastrado e publicado no portfólio!");
      setOpen(false);
      setForm({ couple_names: "", city: "", venue: "", date: "", description: "" });
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao cadastrar"),
  });

  const updateWeddingMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof editForm }) => {
      if (!data) return;
      const { error } = await supabase.from("weddings").update({
        couple_names: data.couple_names,
        city: data.city || null,
        venue: data.venue || null,
        date: data.date || null,
        description: data.description || null,
        style: data.style || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-weddings"] });
      toast.success("Casamento atualizado!");
      setEditingWeddingId(null);
      setEditForm(null);
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, is_published }: { id: string; is_published: boolean }) => {
      const { error } = await supabase.from("weddings").update({ is_published: !is_published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-weddings"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("weddings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-weddings"] });
      toast.success("Removido");
    },
  });

  const handleUploadPhotos = async (weddingId: string, files: FileList) => {
    setUploading(true);
    const currentCount = photos?.length ?? 0;
    let uploaded = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} é muito grande (máx 10MB)`);
        continue;
      }

      const compressed = await compressImage(file);
      const ext = compressed.type === "image/webp" ? "webp" : file.name.split(".").pop();
      const path = `weddings/${weddingId}/${Date.now()}-${i}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("portfolio").upload(path, compressed);
      if (uploadError) {
        toast.error(`Erro ao enviar ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from("portfolio").getPublicUrl(path);

      const { error: dbError } = await supabase.from("portfolio_photos").insert({
        wedding_id: weddingId,
        photo_url: urlData.publicUrl,
        sort_order: currentCount + uploaded,
      });

      if (dbError) {
        toast.error(`Erro ao salvar ${file.name}`);
        continue;
      }
      uploaded++;
    }

    if (uploaded > 0) {
      toast.success(`${uploaded} foto(s) enviada(s)!`);
      queryClient.invalidateQueries({ queryKey: ["admin-photos", weddingId] });
    }
    setUploading(false);
  };

  const deletePhoto = useMutation({
    mutationFn: async ({ id, photo_url }: { id: string; photo_url: string }) => {
      const urlParts = photo_url.split("/portfolio/");
      if (urlParts[1]) {
        await supabase.storage.from("portfolio").remove([urlParts[1]]);
      }
      const { error } = await supabase.from("portfolio_photos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-photos", expandedId] });
      toast.success("Foto removida");
    },
  });

  const setCoverPhoto = useMutation({
    mutationFn: async ({ weddingId, url }: { weddingId: string; url: string }) => {
      const { error } = await supabase.from("weddings").update({ cover_photo_url: url }).eq("id", weddingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-weddings"] });
      toast.success("Capa atualizada!");
    },
  });

  const addYoutubeVideo = useMutation({
    mutationFn: async ({ weddingId, url }: { weddingId: string; url: string }) => {
      const { error } = await supabase.from("portfolio_videos").insert({
        wedding_id: weddingId,
        youtube_url: url,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-wedding-videos", expandedId] });
      setYoutubeUrl("");
      toast.success("Vídeo adicionado!");
    },
    onError: () => toast.error("Erro ao adicionar vídeo"),
  });

  const deleteVideo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portfolio_videos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-wedding-videos", expandedId] });
      toast.success("Vídeo removido");
    },
  });

  const updateVideoTitle = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from("portfolio_videos").update({ title: title || null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-wedding-videos", expandedId] });
      setEditingId(null);
      toast.success("Título atualizado");
    },
  });

  const updatePhotoCaption = useMutation({
    mutationFn: async ({ id, caption }: { id: string; caption: string }) => {
      const { error } = await supabase.from("portfolio_photos").update({ caption: caption || null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-photos", expandedId] });
      setEditingId(null);
      toast.success("Legenda atualizada");
    },
  });

  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]+)/);
    return match?.[1] ?? "";
  };

  const reorderPhotos = async (reordered: NonNullable<typeof photos>) => {
    queryClient.setQueryData(["admin-photos", expandedId], reordered);
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from("portfolio_photos").update({ sort_order: i }).eq("id", reordered[i].id);
    }
  };

  const reorderVideos = async (reordered: NonNullable<typeof weddingVideos>) => {
    queryClient.setQueryData(["admin-wedding-videos", expandedId], reordered);
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from("portfolio_videos").update({ sort_order: i }).eq("id", reordered[i].id);
    }
  };

  const togglePhotoPortfolio = useMutation({
    mutationFn: async ({ id, current, scope }: { id: string; current: boolean; scope: "wedding" | "standalone" }) => {
      const { error } = await supabase.from("portfolio_photos").update({ show_in_portfolio: !current }).eq("id", id);
      if (error) throw error;
      return scope;
    },
    onSuccess: (scope) => {
      if (scope === "wedding") queryClient.invalidateQueries({ queryKey: ["admin-photos", expandedId] });
      else queryClient.invalidateQueries({ queryKey: ["admin-standalone-photos"] });
    },
  });

  const toggleVideoPortfolio = useMutation({
    mutationFn: async ({ id, current, scope }: { id: string; current: boolean; scope: "wedding" | "standalone" }) => {
      const { error } = await supabase.from("portfolio_videos").update({ show_in_portfolio: !current }).eq("id", id);
      if (error) throw error;
      return scope;
    },
    onSuccess: (scope) => {
      if (scope === "wedding") queryClient.invalidateQueries({ queryKey: ["admin-wedding-videos", expandedId] });
      else queryClient.invalidateQueries({ queryKey: ["admin-standalone-videos"] });
    },
  });

  // ─── Standalone media (avulso) ───
  const { data: standaloneVideos } = useQuery({
    queryKey: ["admin-standalone-videos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("portfolio_videos").select("*").is("wedding_id", null).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: standalonePhotos } = useQuery({
    queryKey: ["admin-standalone-photos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("portfolio_photos").select("*").is("wedding_id", null).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const addStandaloneVideo = useMutation({
    mutationFn: async ({ url, title }: { url: string; title: string }) => {
      const { error } = await supabase.from("portfolio_videos").insert({ youtube_url: url, title: title || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-standalone-videos"] });
      setStandaloneYoutubeUrl("");
      setStandaloneVideoTitle("");
      toast.success("Vídeo adicionado!");
    },
  });

  const deleteStandaloneVideo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portfolio_videos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-standalone-videos"] });
      toast.success("Vídeo removido");
    },
  });

  const deleteStandalonePhoto = useMutation({
    mutationFn: async ({ id, photo_url }: { id: string; photo_url: string }) => {
      const urlParts = photo_url.split("/portfolio/");
      if (urlParts[1]) await supabase.storage.from("portfolio").remove([urlParts[1]]);
      const { error } = await supabase.from("portfolio_photos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-standalone-photos"] });
      toast.success("Foto removida");
    },
  });

  const handleStandalonePhotoUpload = async (files: FileList) => {
    setUploadingStandalone(true);
    const currentCount = standalonePhotos?.length ?? 0;
    let uploaded = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name} é muito grande`); continue; }
      const compressed = await compressImage(file);
      const ext = compressed.type === "image/webp" ? "webp" : file.name.split(".").pop();
      const path = `standalone/${Date.now()}-${i}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("portfolio").upload(path, compressed);
      if (uploadError) { toast.error(`Erro ao enviar ${file.name}`); continue; }
      const { data: urlData } = supabase.storage.from("portfolio").getPublicUrl(path);
      const { error: dbError } = await supabase.from("portfolio_photos").insert({ photo_url: urlData.publicUrl, sort_order: currentCount + uploaded, wedding_id: null as any });
      if (dbError) { toast.error(`Erro ao salvar ${file.name}`); continue; }
      uploaded++;
    }
    if (uploaded > 0) {
      toast.success(`${uploaded} foto(s) enviada(s)!`);
      queryClient.invalidateQueries({ queryKey: ["admin-standalone-photos"] });
    }
    setUploadingStandalone(false);
  };

  const reorderStandaloneVideos = async (reordered: NonNullable<typeof standaloneVideos>) => {
    queryClient.setQueryData(["admin-standalone-videos"], reordered);
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from("portfolio_videos").update({ sort_order: i }).eq("id", reordered[i].id);
    }
  };

  const reorderStandalonePhotos = async (reordered: NonNullable<typeof standalonePhotos>) => {
    queryClient.setQueryData(["admin-standalone-photos"], reordered);
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from("portfolio_photos").update({ sort_order: i }).eq("id", reordered[i].id);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl text-foreground">Casamentos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus size={16} className="mr-1" /> Novo Casamento</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">Novo Casamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
              <div>
                <Label className="font-body text-sm">Nomes do Casal *</Label>
                <Input value={form.couple_names} onChange={(e) => setForm({ ...form, couple_names: e.target.value })} required />
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
                <Label className="font-body text-sm">Data</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label className="font-body text-sm">Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground font-body text-sm">Carregando...</p>
      ) : weddings?.length === 0 ? (
        <p className="text-muted-foreground font-body text-sm">Nenhum casamento cadastrado.</p>
      ) : (
        <div className="space-y-3">
          {weddings?.map((w) => {
            const isExpanded = expandedId === w.id;
            return (
              <div key={w.id} className="bg-card border border-border rounded-lg overflow-hidden">
                {/* Header */}
                <div className="p-4 flex items-center justify-between">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : w.id)}
                    className="flex items-center gap-3 text-left flex-1"
                  >
                    {w.cover_photo_url ? (
                      <img src={w.cover_photo_url} alt="" className="w-12 h-12 rounded object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                        <ImageIcon size={18} className="text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-body text-sm font-medium text-foreground">{w.couple_names}</p>
                      <p className="font-body text-xs text-muted-foreground">
                        {w.city}{w.date ? ` • ${new Date(w.date).toLocaleDateString("pt-BR")}` : ""}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                  </button>
                  <div className="flex items-center gap-2 ml-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => togglePublish.mutate({ id: w.id, is_published: w.is_published })}
                      title={w.is_published ? "Despublicar" : "Publicar"}
                    >
                      {w.is_published ? <Eye size={16} className="text-green-600" /> : <EyeOff size={16} />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(w.id)}>
                      <Trash2 size={16} className="text-destructive" />
                    </Button>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-border p-4 space-y-6">
                    {/* Edit wedding details */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-heading text-sm text-foreground flex items-center gap-2">
                          <Pencil size={14} /> Informações
                        </h4>
                        {editingWeddingId !== w.id ? (
                          <Button variant="outline" size="sm" onClick={() => {
                            setEditingWeddingId(w.id);
                            setEditForm({
                              couple_names: w.couple_names,
                              city: w.city || "",
                              venue: w.venue || "",
                              date: w.date || "",
                              description: w.description || "",
                              style: w.style || "",
                            });
                          }}>
                            <Pencil size={14} className="mr-1" /> Editar
                          </Button>
                        ) : (
                          <div className="flex gap-2">
                            <Button size="sm" disabled={updateWeddingMutation.isPending} onClick={() => updateWeddingMutation.mutate({ id: w.id, data: editForm })}>
                              <Check size={14} className="mr-1" /> {updateWeddingMutation.isPending ? "Salvando..." : "Salvar"}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { setEditingWeddingId(null); setEditForm(null); }}>
                              Cancelar
                            </Button>
                          </div>
                        )}
                      </div>
                      {editingWeddingId === w.id && editForm ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label className="font-body text-xs">Nomes do Casal</Label>
                            <Input value={editForm.couple_names} onChange={(e) => setEditForm({ ...editForm, couple_names: e.target.value })} className="h-9 text-sm" />
                          </div>
                          <div>
                            <Label className="font-body text-xs">Cidade</Label>
                            <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className="h-9 text-sm" />
                          </div>
                          <div>
                            <Label className="font-body text-xs">Local</Label>
                            <Input value={editForm.venue} onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })} className="h-9 text-sm" />
                          </div>
                          <div>
                            <Label className="font-body text-xs">Data</Label>
                            <Input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="h-9 text-sm" />
                          </div>
                          <div>
                            <Label className="font-body text-xs">Estilo</Label>
                            <Input value={editForm.style} onChange={(e) => setEditForm({ ...editForm, style: e.target.value })} placeholder="Ex: Rústico, Clássico..." className="h-9 text-sm" />
                          </div>
                          <div className="sm:col-span-2">
                            <Label className="font-body text-xs">Descrição</Label>
                            <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="text-sm" rows={2} />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-body text-muted-foreground">
                          <span><strong className="text-foreground">Casal:</strong> {w.couple_names}</span>
                          <span><strong className="text-foreground">Cidade:</strong> {w.city || "—"}</span>
                          <span><strong className="text-foreground">Local:</strong> {w.venue || "—"}</span>
                          <span><strong className="text-foreground">Data:</strong> {w.date ? new Date(w.date).toLocaleDateString("pt-BR") : "—"}</span>
                          <span><strong className="text-foreground">Estilo:</strong> {w.style || "—"}</span>
                          {w.description && <span className="col-span-2 sm:col-span-3"><strong className="text-foreground">Descrição:</strong> {w.description}</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-primary/40 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors">
                        <Upload size={16} className="text-primary" />
                        <span className="font-body text-sm text-primary">
                          {uploading ? "Enviando..." : "Subir Fotos"}
                        </span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          disabled={uploading}
                          onChange={(e) => {
                            if (e.target.files?.length) {
                              handleUploadPhotos(w.id, e.target.files);
                              e.target.value = "";
                            }
                          }}
                        />
                      </label>
                      <span className="font-body text-xs text-muted-foreground">
                        {photos?.length ?? 0} foto(s) • Máx 10MB cada • Arraste para reordenar
                      </span>
                    </div>

                    {/* Photo grid with drag and drop */}
                    <div>
                      <h4 className="font-heading text-sm text-foreground mb-2 flex items-center gap-2">
                        <ImageIcon size={14} /> Fotos
                      </h4>
                      {photos && photos.length > 0 ? (
                        <SortableGrid
                          items={photos}
                          onReorder={reorderPhotos}
                          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2"
                          renderItem={(p) => {
                            const isEditingThis = editingId === `photo-${p.id}`;
                            return (
                              <div className={`relative group rounded-lg overflow-hidden bg-muted ${!p.show_in_portfolio ? "opacity-50" : ""}`}>
                                <div className="aspect-square">
                                  <img src={p.photo_url} alt={p.caption || ""} className="w-full h-full object-cover" />
                                </div>
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" title="Definir como capa"
                                    onClick={() => setCoverPhoto.mutate({ weddingId: w.id, url: p.photo_url })}>
                                    <ImageIcon size={14} />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" title="Editar legenda"
                                    onClick={() => { setEditingId(`photo-${p.id}`); setEditValue(p.caption || ""); }}>
                                    <Pencil size={14} />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8"
                                    title={p.show_in_portfolio ? "Ocultar do portfólio" : "Mostrar no portfólio"}
                                    onClick={() => togglePhotoPortfolio.mutate({ id: p.id, current: p.show_in_portfolio, scope: "wedding" })}>
                                    {p.show_in_portfolio ? <Eye size={14} /> : <EyeOff size={14} />}
                                  </Button>
                                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" title="Remover"
                                    onClick={() => deletePhoto.mutate({ id: p.id, photo_url: p.photo_url })}>
                                    <X size={14} />
                                  </Button>
                                </div>
                                {w.cover_photo_url === p.photo_url && (
                                  <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-body">Capa</span>
                                )}
                                {!p.show_in_portfolio && (
                                  <span className="absolute top-1 right-1 bg-background/80 text-foreground text-[10px] px-1.5 py-0.5 rounded font-body">Oculto</span>
                                )}
                                {isEditingThis && (
                                  <div className="absolute bottom-0 left-0 right-0 bg-card/95 p-1.5 flex gap-1">
                                    <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-6 text-xs" placeholder="Legenda" autoFocus />
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updatePhotoCaption.mutate({ id: p.id, caption: editValue })}><Check size={12} /></Button>
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}><X size={12} /></Button>
                                  </div>
                                )}
                              </div>
                            );
                          }}
                        />
                      ) : (
                        <p className="font-body text-xs text-muted-foreground">Nenhuma foto ainda.</p>
                      )}
                    </div>

                    {/* Videos section with drag and drop */}
                    <div>
                      <h4 className="font-heading text-sm text-foreground mb-2 flex items-center gap-2">
                        <Film size={14} /> Vídeos
                      </h4>
                      <div className="flex items-center gap-2 mb-3">
                        <Input
                          value={youtubeUrl}
                          onChange={(e) => setYoutubeUrl(e.target.value)}
                          placeholder="Cole a URL do YouTube aqui..."
                          className="text-sm h-9"
                        />
                        <Button
                          size="sm"
                          disabled={!youtubeUrl.trim() || addYoutubeVideo.isPending}
                          onClick={() => addYoutubeVideo.mutate({ weddingId: w.id, url: youtubeUrl.trim() })}
                        >
                          <Plus size={14} className="mr-1" /> Adicionar
                        </Button>
                      </div>
                      {weddingVideos && weddingVideos.length > 0 ? (
                        <SortableGrid
                          items={weddingVideos}
                          onReorder={reorderVideos}
                          className="grid grid-cols-2 sm:grid-cols-3 gap-3"
                          renderItem={(v) => {
                            const ytId = getYouTubeId(v.youtube_url);
                            const isEditingThis = editingId === `video-${v.id}`;
                            return (
                              <div className={`bg-muted rounded-lg overflow-hidden ${!v.show_in_portfolio ? "opacity-50" : ""}`}>
                                {ytId && (
                                  <div className="relative">
                                    <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={v.title ?? ""} className="w-full aspect-video object-cover" />
                                    {!v.show_in_portfolio && (
                                      <span className="absolute top-1 right-1 bg-background/80 text-foreground text-[10px] px-1.5 py-0.5 rounded font-body">Oculto</span>
                                    )}
                                  </div>
                                )}
                                <div className="p-2">
                                  {isEditingThis ? (
                                    <div className="flex items-center gap-1">
                                      <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-7 text-xs" placeholder="Título" autoFocus />
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateVideoTitle.mutate({ id: v.id, title: editValue })}><Check size={12} /></Button>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}><X size={12} /></Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between">
                                      <p className="font-body text-xs text-foreground truncate">{v.title || "Sem título"}</p>
                                      <div className="flex gap-0.5">
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingId(`video-${v.id}`); setEditValue(v.title || ""); }} title="Editar título"><Pencil size={11} /></Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6"
                                          title={v.show_in_portfolio ? "Ocultar do portfólio" : "Mostrar no portfólio"}
                                          onClick={() => toggleVideoPortfolio.mutate({ id: v.id, current: v.show_in_portfolio, scope: "wedding" })}>
                                          {v.show_in_portfolio ? <Eye size={11} /> : <EyeOff size={11} className="text-muted-foreground" />}
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteVideo.mutate(v.id)} title="Remover"><Trash2 size={11} className="text-destructive" /></Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          }}
                        />
                      ) : (
                        <p className="font-body text-xs text-muted-foreground">Nenhum vídeo. Cole uma URL do YouTube acima.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Mídia Avulsa ─── */}
      <div className="mt-10 border-t border-border pt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-xl text-foreground">Mídia Avulsa (Portfólio Geral)</h2>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-primary/40 rounded-lg cursor-pointer hover:bg-primary/5 transition-colors">
              <Upload size={16} className="text-primary" />
              <span className="font-body text-sm text-primary">
                {uploadingStandalone ? "Enviando..." : "Subir Fotos"}
              </span>
              <input type="file" multiple accept="image/*" className="hidden" disabled={uploadingStandalone}
                onChange={(e) => { if (e.target.files?.length) { handleStandalonePhotoUpload(e.target.files); e.target.value = ""; } }} />
            </label>
          </div>
        </div>

        {/* Add standalone video */}
        <div className="flex items-center gap-2 mb-6">
          <Input value={standaloneVideoTitle} onChange={(e) => setStandaloneVideoTitle(e.target.value)} placeholder="Título (opcional)" className="max-w-[200px]" />
          <Input value={standaloneYoutubeUrl} onChange={(e) => setStandaloneYoutubeUrl(e.target.value)} placeholder="URL do YouTube..." className="flex-1" />
          <Button size="sm" disabled={!standaloneYoutubeUrl.trim() || addStandaloneVideo.isPending}
            onClick={() => addStandaloneVideo.mutate({ url: standaloneYoutubeUrl.trim(), title: standaloneVideoTitle.trim() })}>
            <Plus size={14} className="mr-1" /> Vídeo
          </Button>
        </div>

        {/* Standalone videos */}
        {standaloneVideos && standaloneVideos.length > 0 && (
          <div className="mb-6">
            <h3 className="font-heading text-sm text-foreground mb-3 flex items-center gap-2"><Film size={14} /> Vídeos ({standaloneVideos.length})</h3>
            <SortableGrid items={standaloneVideos} onReorder={reorderStandaloneVideos}
              className="grid grid-cols-2 md:grid-cols-3 gap-3"
              renderItem={(v) => {
                const ytId = getYouTubeId(v.youtube_url);
                const isEditingThis = editingId === `sv-${v.id}`;
                return (
                  <div className={`bg-card border border-border rounded-lg overflow-hidden ${!v.show_in_portfolio ? "opacity-50" : ""}`}>
                    {ytId && (
                      <div className="relative">
                        <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={v.title ?? ""} className="w-full aspect-video object-cover" />
                        {!v.show_in_portfolio && (
                          <span className="absolute top-1 right-1 bg-background/80 text-foreground text-[10px] px-1.5 py-0.5 rounded font-body">Oculto</span>
                        )}
                      </div>
                    )}
                    <div className="p-2 flex items-center justify-between gap-1">
                      {isEditingThis ? (
                        <div className="flex items-center gap-1 flex-1">
                          <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-7 text-xs" autoFocus />
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {
                            supabase.from("portfolio_videos").update({ title: editValue || null }).eq("id", v.id).then(() => {
                              queryClient.invalidateQueries({ queryKey: ["admin-standalone-videos"] });
                              setEditingId(null);
                            });
                          }}><Check size={12} /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}><X size={12} /></Button>
                        </div>
                      ) : (
                        <>
                          <p className="font-body text-xs text-foreground truncate flex-1">{v.title || "Sem título"}</p>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingId(`sv-${v.id}`); setEditValue(v.title || ""); }} title="Editar título"><Pencil size={11} /></Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6"
                        title={v.show_in_portfolio ? "Ocultar do portfólio" : "Mostrar no portfólio"}
                        onClick={() => toggleVideoPortfolio.mutate({ id: v.id, current: v.show_in_portfolio, scope: "standalone" })}>
                        {v.show_in_portfolio ? <Eye size={11} /> : <EyeOff size={11} className="text-muted-foreground" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteStandaloneVideo.mutate(v.id)} title="Remover">
                        <Trash2 size={11} className="text-destructive" />
                      </Button>
                    </div>
                  </div>
                );
              }}
            />
          </div>
        )}

        {/* Standalone photos */}
        {standalonePhotos && standalonePhotos.length > 0 && (
          <div>
            <h3 className="font-heading text-sm text-foreground mb-3 flex items-center gap-2"><ImageIcon size={14} /> Fotos ({standalonePhotos.length})</h3>
            <SortableGrid items={standalonePhotos} onReorder={reorderStandalonePhotos}
              className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2"
              renderItem={(p) => (
                <div className={`relative group rounded-lg overflow-hidden bg-muted ${!p.show_in_portfolio ? "opacity-50" : ""}`}>
                  <div className="aspect-square">
                    <img src={p.photo_url} alt={p.caption || ""} className="w-full h-full object-cover" />
                  </div>
                  {!p.show_in_portfolio && (
                    <span className="absolute top-1 right-1 bg-background/80 text-foreground text-[10px] px-1.5 py-0.5 rounded font-body">Oculto</span>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8"
                      title={p.show_in_portfolio ? "Ocultar do portfólio" : "Mostrar no portfólio"}
                      onClick={() => togglePhotoPortfolio.mutate({ id: p.id, current: p.show_in_portfolio, scope: "standalone" })}>
                      {p.show_in_portfolio ? <Eye size={14} /> : <EyeOff size={14} />}
                    </Button>
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" title="Remover"
                      onClick={() => deleteStandalonePhoto.mutate({ id: p.id, photo_url: p.photo_url })}>
                      <X size={14} />
                    </Button>
                  </div>
                </div>
              )}
            />
          </div>
        )}

        {(!standaloneVideos || standaloneVideos.length === 0) && (!standalonePhotos || standalonePhotos.length === 0) && (
          <p className="text-muted-foreground font-body text-sm text-center py-4">Nenhuma mídia avulsa. Use os botões acima para adicionar.</p>
        )}
      </div>
    </div>
  );
};

export default AdminWeddings;
