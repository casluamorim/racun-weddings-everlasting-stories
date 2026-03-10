import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Film, ImageIcon, Pencil, Check, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SortableGrid } from "@/components/admin/SortablePhotoGrid";
import { compressImage } from "@/lib/imageCompression";

const AdminVideos = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ youtube_url: "", title: "" });
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");

  const { data: videos, isLoading: loadingVideos } = useQuery({
    queryKey: ["admin-videos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("portfolio_videos").select("*").is("wedding_id", null).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: photos, isLoading: loadingPhotos } = useQuery({
    queryKey: ["admin-standalone-photos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portfolio_photos")
        .select("*")
        .is("wedding_id", null)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const createVideoMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("portfolio_videos").insert({
        youtube_url: form.youtube_url,
        title: form.title || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
      toast.success("Vídeo adicionado!");
      setOpen(false);
      setForm({ youtube_url: "", title: "" });
    },
    onError: () => toast.error("Erro ao adicionar vídeo"),
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portfolio_videos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
      toast.success("Vídeo removido");
    },
  });

  const updateVideoTitle = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from("portfolio_videos").update({ title: title || null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-videos"] });
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
      queryClient.invalidateQueries({ queryKey: ["admin-standalone-photos"] });
      setEditingId(null);
      toast.success("Legenda atualizada");
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async ({ id, photo_url }: { id: string; photo_url: string }) => {
      const urlParts = photo_url.split("/portfolio/");
      if (urlParts[1]) {
        await supabase.storage.from("portfolio").remove([urlParts[1]]);
      }
      const { error } = await supabase.from("portfolio_photos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-standalone-photos"] });
      toast.success("Foto removida");
    },
  });

  const reorderPhotos = async (reordered: typeof photos extends (infer T)[] | undefined ? T[] : never[]) => {
    // Optimistic update
    queryClient.setQueryData(["admin-standalone-photos"], reordered);
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from("portfolio_photos").update({ sort_order: i }).eq("id", reordered[i].id);
    }
  };

  const reorderVideos = async (reordered: typeof videos extends (infer T)[] | undefined ? T[] : never[]) => {
    queryClient.setQueryData(["admin-videos"], reordered);
    for (let i = 0; i < reordered.length; i++) {
      await supabase.from("portfolio_videos").update({ sort_order: i }).eq("id", reordered[i].id);
    }
  };

  const handleBulkPhotoUpload = async (files: FileList) => {
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
      const path = `standalone/${Date.now()}-${i}.${ext}`;

      const { error: uploadError } = await supabase.storage.from("portfolio").upload(path, compressed);
      if (uploadError) {
        toast.error(`Erro ao enviar ${file.name}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from("portfolio").getPublicUrl(path);

      const { error: dbError } = await supabase.from("portfolio_photos").insert({
        photo_url: urlData.publicUrl,
        sort_order: currentCount + uploaded,
        wedding_id: null as any,
      });

      if (dbError) {
        toast.error(`Erro ao salvar ${file.name}`);
        continue;
      }
      uploaded++;
    }

    if (uploaded > 0) {
      toast.success(`${uploaded} foto(s) enviada(s)!`);
      queryClient.invalidateQueries({ queryKey: ["admin-standalone-photos"] });
    }
    setUploading(false);
  };

  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]+)/);
    return match?.[1] ?? "";
  };

  const isLoading = loadingVideos || loadingPhotos;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl text-foreground">Vídeos & Fotos</h1>
        <div className="flex items-center gap-2">
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
                  handleBulkPhotoUpload(e.target.files);
                  e.target.value = "";
                }
              }}
            />
          </label>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus size={16} className="mr-1" /> Vídeo YouTube</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading">Adicionar Vídeo</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createVideoMutation.mutate(); }} className="space-y-4">
                <div>
                  <Label className="font-body text-sm">URL do YouTube *</Label>
                  <Input value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} required placeholder="https://youtube.com/watch?v=..." />
                </div>
                <div>
                  <Label className="font-body text-sm">Título (opcional)</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <Button type="submit" className="w-full" disabled={createVideoMutation.isPending}>
                  {createVideoMutation.isPending ? "Salvando..." : "Adicionar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground font-body text-sm">Carregando...</p>
      ) : (
        <div className="space-y-8">
          {/* Videos section */}
          {videos && videos.length > 0 && (
            <div>
              <h2 className="font-heading text-lg text-foreground mb-4 flex items-center gap-2">
                <Film size={18} /> Vídeos ({videos.length})
                <span className="font-body text-xs text-muted-foreground ml-2">Arraste para reordenar</span>
              </h2>
              <SortableGrid
                items={videos}
                onReorder={reorderVideos}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                renderItem={(v) => {
                  const ytId = getYouTubeId(v.youtube_url);
                  const isEditing = editingId === `video-${v.id}`;
                  return (
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                      {ytId && (
                        <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt={v.title ?? ""} className="w-full aspect-video object-cover" />
                      )}
                      <div className="p-3 flex items-center justify-between gap-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1 flex-1">
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="h-7 text-sm"
                              placeholder="Título"
                              autoFocus
                            />
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateVideoTitle.mutate({ id: v.id, title: editTitle })}>
                              <Check size={14} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}>
                              <X size={14} />
                            </Button>
                          </div>
                        ) : (
                          <>
                            <p className="font-body text-sm text-foreground truncate flex-1">{v.title || "Sem título"}</p>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(`video-${v.id}`); setEditTitle(v.title || ""); }}>
                              <Pencil size={14} />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteVideoMutation.mutate(v.id)}>
                          <Trash2 size={14} className="text-destructive" />
                        </Button>
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          )}

          {/* Photos section */}
          {photos && photos.length > 0 && (
            <div>
              <h2 className="font-heading text-lg text-foreground mb-4 flex items-center gap-2">
                <ImageIcon size={18} /> Fotos ({photos.length})
                <span className="font-body text-xs text-muted-foreground ml-2">Arraste para reordenar</span>
              </h2>
              <SortableGrid
                items={photos}
                onReorder={reorderPhotos}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
                renderItem={(p) => {
                  const isEditing = editingId === `photo-${p.id}`;
                  return (
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                      <div className="aspect-square">
                        <img src={p.photo_url} alt={p.caption || ""} className="w-full h-full object-cover" />
                      </div>
                      <div className="p-2">
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            <Input
                              value={editCaption}
                              onChange={(e) => setEditCaption(e.target.value)}
                              className="h-7 text-xs"
                              placeholder="Legenda"
                              autoFocus
                            />
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updatePhotoCaption.mutate({ id: p.id, caption: editCaption })}>
                              <Check size={12} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}>
                              <X size={12} />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between">
                            <p className="font-body text-xs text-muted-foreground truncate">{p.caption || "Sem legenda"}</p>
                            <div className="flex items-center gap-0.5">
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingId(`photo-${p.id}`); setEditCaption(p.caption || ""); }}>
                                <Pencil size={11} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deletePhotoMutation.mutate({ id: p.id, photo_url: p.photo_url })}>
                                <Trash2 size={11} className="text-destructive" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
            </div>
          )}

          {(!videos || videos.length === 0) && (!photos || photos.length === 0) && (
            <p className="text-muted-foreground font-body text-sm text-center py-8">
              Nenhum conteúdo cadastrado. Use os botões acima para adicionar.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminVideos;
