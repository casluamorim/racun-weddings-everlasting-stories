import { useState, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Upload, Trash2, Star, Image as ImageIcon, Film, Copy, RefreshCw } from "lucide-react";
import { compressForWeb, compressForThumb, uploadWithRetry, paths, randomFilename, signedUrls, GALLERY_BUCKET } from "@/lib/galleryStorage";

const AdminGalleryEdit = () => {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [uploading, setUploading] = useState(false);

  const { data: gallery, isLoading } = useQuery({
    queryKey: ["admin-gallery", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("wedding_galleries").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: files } = useQuery({
    queryKey: ["admin-gallery-files", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("gallery_files").select("*").eq("gallery_id", id!).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!files || files.length === 0) return;
    const pathsToSign = files.map((f) => f.thumb_path || f.web_path).filter(Boolean) as string[];
    signedUrls(pathsToSign).then(setThumbs).catch(() => {});
  }, [files]);

  const [form, setForm] = useState<any>(null);
  useEffect(() => { if (gallery) setForm(gallery); }, [gallery]);

  const saveMutation = useMutation({
    mutationFn: async (patch: any) => {
      const { error } = await supabase.from("wedding_galleries").update(patch).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-gallery", id] });
      qc.invalidateQueries({ queryKey: ["admin-galleries"] });
      toast.success("Salvo!");
    },
    onError: (e: any) => toast.error(e?.message || "Erro"),
  });

  const handleUpload = async (filesList: FileList) => {
    if (!id) return;
    setUploading(true);
    const items = Array.from(filesList);
    setProgress({ done: 0, total: items.length });
    const currentCount = files?.length ?? 0;
    let done = 0;

    // limit concurrency
    const concurrency = 3;
    let cursor = 0;
    const worker = async () => {
      while (cursor < items.length) {
        const my = cursor++;
        const file = items[my];
        try {
          if (file.type.startsWith("image/")) {
            const originalName = randomFilename(file.name, file.name.split(".").pop());
            const webName = randomFilename(file.name, "webp");
            const thumbName = webName;

            const [webFile, thumbFile] = await Promise.all([compressForWeb(file), compressForThumb(file)]);

            const originalPath = paths.original(id, originalName);
            const webPath = paths.web(id, webName);
            const thumbPath = paths.thumb(id, thumbName);

            await Promise.all([
              uploadWithRetry(originalPath, file),
              uploadWithRetry(webPath, webFile),
              uploadWithRetry(thumbPath, thumbFile),
            ]);

            await supabase.from("gallery_files").insert({
              gallery_id: id,
              kind: "photo",
              file_name: file.name,
              mime_type: file.type,
              size_bytes: file.size,
              original_path: originalPath,
              web_path: webPath,
              thumb_path: thumbPath,
              sort_order: currentCount + my,
            });
          } else if (file.type.startsWith("video/")) {
            const ext = file.name.split(".").pop() || "mp4";
            const name = randomFilename(file.name, ext);
            const originalPath = paths.videoOriginal(id, name);
            const webPath = paths.videoWeb(id, name);
            // Upload original then server-side copy to web (keeps web after retention purge)
            await uploadWithRetry(originalPath, file);
            await supabase.storage.from(GALLERY_BUCKET).copy(originalPath, webPath);

            await supabase.from("gallery_files").insert({
              gallery_id: id,
              kind: "video",
              file_name: file.name,
              mime_type: file.type,
              size_bytes: file.size,
              original_path: originalPath,
              web_path: webPath,
              sort_order: currentCount + my,
            });
          }
          done++;
          setProgress({ done, total: items.length });
        } catch (err) {
          console.error(err);
          toast.error(`Falha em ${file.name}`);
        }
      }
    };
    await Promise.all(Array.from({ length: concurrency }, worker));

    setUploading(false);
    qc.invalidateQueries({ queryKey: ["admin-gallery-files", id] });
    toast.success(`${done} arquivo(s) enviados!`);
  };

  const deleteFile = useMutation({
    mutationFn: async (f: any) => {
      const toRemove = [f.web_path, f.thumb_path, f.original_path].filter(Boolean);
      if (toRemove.length) await supabase.storage.from(GALLERY_BUCKET).remove(toRemove);
      const { error } = await supabase.from("gallery_files").delete().eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-gallery-files", id] }),
  });

  const setAsCover = useMutation({
    mutationFn: async (f: any) => {
      const { data: signed } = await supabase.storage.from(GALLERY_BUCKET).createSignedUrl(f.web_path, 60 * 60 * 24 * 365 * 5);
      await supabase.from("wedding_galleries").update({ cover_url: signed?.signedUrl ?? null }).eq("id", id!);
      await supabase.from("gallery_files").update({ is_cover: false }).eq("gallery_id", id!);
      await supabase.from("gallery_files").update({ is_cover: true }).eq("id", f.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-gallery", id] });
      qc.invalidateQueries({ queryKey: ["admin-gallery-files", id] });
      toast.success("Capa definida!");
    },
  });

  const copyLink = () => {
    if (!gallery) return;
    const url = `${window.location.origin}/galeria/${gallery.slug}?token=${gallery.access_token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const regenerateToken = useMutation({
    mutationFn: async () => {
      const arr = new Uint8Array(24);
      crypto.getRandomValues(arr);
      const token = Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
      const { error } = await supabase.from("wedding_galleries").update({ access_token: token }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-gallery", id] });
      toast.success("Novo link gerado! O anterior deixou de funcionar.");
    },
  });

  if (isLoading || !gallery || !form) return <p className="text-muted-foreground">Carregando...</p>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <Link to="/admin/galleries" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Link>
        <h1 className="text-3xl font-heading mt-2">{gallery.couple_names}</h1>
      </div>

      {/* Link card */}
      <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Link privado para o casal</p>
            <p className="text-sm font-mono truncate">{window.location.origin}/galeria/{gallery.slug}?token={gallery.access_token.slice(0, 12)}…</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={copyLink}><Copy className="h-4 w-4 mr-1" />Copiar</Button>
            <Button size="sm" variant="outline" onClick={() => regenerateToken.mutate()}><RefreshCw className="h-4 w-4 mr-1" />Novo</Button>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="border rounded-lg p-4 space-y-3">
        <h2 className="font-heading text-lg">Informações</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><Label>Casal</Label><Input value={form.couple_names} onChange={(e) => setForm({ ...form, couple_names: e.target.value })} /></div>
          <div><Label>Slug (URL)</Label><Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></div>
          <div><Label>Data</Label><Input type="date" value={form.event_date ?? ""} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></div>
          <div><Label>Cidade</Label><Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Local</Label><Input value={form.venue ?? ""} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>Descrição curta</Label><Input value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="sm:col-span-2"><Label>História do casal</Label><Textarea rows={4} value={form.story ?? ""} onChange={(e) => setForm({ ...form, story: e.target.value })} /></div>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 pt-2">
          <label className="flex items-center justify-between border rounded p-3"><span className="text-sm">Publicada</span><Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} /></label>
          <label className="flex items-center justify-between border rounded p-3"><span className="text-sm">Exibir no Portfólio</span><Switch checked={form.show_in_portfolio} onCheckedChange={(v) => setForm({ ...form, show_in_portfolio: v })} /></label>
          <label className="flex items-center justify-between border rounded p-3"><span className="text-sm">Destaque na Home</span><Switch checked={form.featured_home} onCheckedChange={(v) => setForm({ ...form, featured_home: v })} /></label>
        </div>
        <Button onClick={() => saveMutation.mutate({
          couple_names: form.couple_names, slug: form.slug, event_date: form.event_date || null,
          city: form.city || null, venue: form.venue || null, description: form.description || null,
          story: form.story || null, is_published: form.is_published, show_in_portfolio: form.show_in_portfolio,
          featured_home: form.featured_home,
        })}>Salvar informações</Button>
      </div>

      {/* Retention */}
      <div className="border rounded-lg p-4 space-y-3">
        <h2 className="font-heading text-lg">Retenção dos arquivos originais</h2>
        <p className="text-sm text-muted-foreground">Após o prazo, apenas os originais são removidos. As versões web do portfólio permanecem para sempre.</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label>Prazo (meses)</Label>
            <select className="w-full border rounded h-10 px-2 bg-background" value={form.retention_months} onChange={(e) => setForm({ ...form, retention_months: Number(e.target.value) })}>
              <option value={6}>6 meses</option>
              <option value={12}>12 meses</option>
              <option value={24}>24 meses</option>
            </select>
          </div>
          <label className="flex items-center justify-between border rounded p-3 sm:col-span-2"><span className="text-sm">Manter permanentemente (VIP)</span><Switch checked={form.keep_originals_forever} onCheckedChange={(v) => setForm({ ...form, keep_originals_forever: v })} /></label>
        </div>
        <p className="text-xs text-muted-foreground">
          {gallery.originals_removed_at ? <Badge variant="destructive">Originais já removidos em {new Date(gallery.originals_removed_at).toLocaleDateString("pt-BR")}</Badge> :
          gallery.keep_originals_forever ? <Badge>Mantidos permanentemente</Badge> :
          gallery.originals_expire_at ? <Badge variant="outline">Expira em {new Date(gallery.originals_expire_at).toLocaleDateString("pt-BR")}</Badge> : null}
        </p>
        <Button variant="outline" onClick={() => saveMutation.mutate({ retention_months: form.retention_months, keep_originals_forever: form.keep_originals_forever })}>Salvar retenção</Button>
      </div>

      {/* Upload */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-heading text-lg">Fotos e Vídeos ({files?.length ?? 0})</h2>
          <Button onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="h-4 w-4 mr-2" />{uploading ? `Enviando ${progress.done}/${progress.total}` : "Enviar arquivos"}
          </Button>
          <input ref={fileRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files)} />
        </div>
        {uploading && <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />}

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {files?.map((f) => (
            <div key={f.id} className="relative group aspect-square bg-muted rounded overflow-hidden">
              {f.kind === "photo" ? (
                thumbs[f.thumb_path || f.web_path] ? (
                  <img src={thumbs[f.thumb_path || f.web_path]} alt="" className="w-full h-full object-cover" loading="lazy" />
                ) : <div className="w-full h-full flex items-center justify-center"><ImageIcon className="h-6 w-6 text-muted-foreground" /></div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-black/80"><Film className="h-8 w-8 text-white/70" /></div>
              )}
              {f.is_cover && <Badge className="absolute top-1 left-1 text-[10px]">Capa</Badge>}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                {f.kind === "photo" && (
                  <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => setAsCover.mutate(f)} title="Definir como capa">
                    <Star className="h-3 w-3" />
                  </Button>
                )}
                <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => { if (confirm("Remover?")) deleteFile.mutate(f); }}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminGalleryEdit;
