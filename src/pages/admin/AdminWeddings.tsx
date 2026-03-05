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

const AdminWeddings = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [form, setForm] = useState({ couple_names: "", city: "", venue: "", date: "", description: "" });

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

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("weddings").insert({
        couple_names: form.couple_names,
        city: form.city || null,
        venue: form.venue || null,
        date: form.date || null,
        description: form.description || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-weddings"] });
      toast.success("Casamento cadastrado!");
      setOpen(false);
      setForm({ couple_names: "", city: "", venue: "", date: "", description: "" });
    },
    onError: () => toast.error("Erro ao cadastrar"),
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

      const ext = file.name.split(".").pop();
      const path = `weddings/${weddingId}/${Date.now()}-${i}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("portfolio").upload(path, file);
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
      // Extract storage path from URL
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
                    {/* Upload area */}
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
                        {photos?.length ?? 0} foto(s) • Máx 10MB cada
                      </span>
                    </div>

                    {/* Photo grid */}
                    <div>
                      <h4 className="font-heading text-sm text-foreground mb-2 flex items-center gap-2">
                        <ImageIcon size={14} /> Fotos
                      </h4>
                      {photos && photos.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                          {photos.map((p) => {
                            const isEditingThis = editingId === `photo-${p.id}`;
                            return (
                              <div key={p.id} className="relative group rounded-lg overflow-hidden bg-muted">
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
                                  <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 h-8 w-8" title="Remover"
                                    onClick={() => deletePhoto.mutate({ id: p.id, photo_url: p.photo_url })}>
                                    <X size={14} />
                                  </Button>
                                </div>
                                {w.cover_photo_url === p.photo_url && (
                                  <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded font-body">Capa</span>
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
                          })}
                        </div>
                      ) : (
                        <p className="font-body text-xs text-muted-foreground">Nenhuma foto ainda.</p>
                      )}
                    </div>

                    {/* Videos section */}
                    <div>
                      <h4 className="font-heading text-sm text-foreground mb-2 flex items-center gap-2">
                        <Film size={14} /> Vídeos
                      </h4>
                      {/* Add YouTube URL */}
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
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {weddingVideos.map((v) => {
                            const ytId = getYouTubeId(v.youtube_url);
                            const isEditingThis = editingId === `video-${v.id}`;
                            return (
                              <div key={v.id} className="bg-muted rounded-lg overflow-hidden">
                                {ytId && <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={v.title ?? ""} className="w-full aspect-video object-cover" />}
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
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingId(`video-${v.id}`); setEditValue(v.title || ""); }}><Pencil size={11} /></Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteVideo.mutate(v.id)}><Trash2 size={11} className="text-destructive" /></Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
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
    </div>
  );
};

export default AdminWeddings;
