import { useCallback, useState, useEffect } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Monitor, Smartphone, Upload } from "lucide-react";
import { toast } from "sonner";
import { uploadWithRetry, paths, GALLERY_BUCKET, signedUrls } from "@/lib/galleryStorage";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  open: boolean;
  onClose: () => void;
  galleryId: string;
  photoOptions: { id: string; web_path: string; thumb_path?: string | null }[];
  initialUrl?: string | null;
  onSaved: (urls: { desktopUrl: string; mobileUrl: string }) => void;
};

const ASPECTS = {
  desktop: { ratio: 16 / 9, w: 1920, h: 1080, label: "Desktop (16:9)", icon: Monitor },
  mobile: { ratio: 9 / 16, w: 1080, h: 1920, label: "Mobile (9:16)", icon: Smartphone },
} as const;

type DeviceKey = keyof typeof ASPECTS;

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

async function cropToBlob(imageUrl: string, area: Area, outW: number, outH: number): Promise<Blob> {
  const img = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, outW, outH);
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("crop failed"))), "image/webp", 0.9)
  );
}

export default function CoverCropDialog({ open, onClose, galleryId, photoOptions, initialUrl, onSaved }: Props) {
  const [step, setStep] = useState<"pick" | "crop">("pick");
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [device, setDevice] = useState<DeviceKey>("desktop");

  const [crops, setCrops] = useState<Record<DeviceKey, { crop: { x: number; y: number }; zoom: number; area: Area | null }>>({
    desktop: { crop: { x: 0, y: 0 }, zoom: 1, area: null },
    mobile: { crop: { x: 0, y: 0 }, zoom: 1, area: null },
  });
  const [saving, setSaving] = useState(false);
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setStep("pick");
    setSourceUrl(null);
    setCrops({ desktop: { crop: { x: 0, y: 0 }, zoom: 1, area: null }, mobile: { crop: { x: 0, y: 0 }, zoom: 1, area: null } });
  }, [open]);

  useEffect(() => {
    if (!open || photoOptions.length === 0) return;
    const paths = photoOptions.map((p) => p.thumb_path || p.web_path).filter(Boolean) as string[];
    signedUrls(paths, 3600).then(setThumbUrls).catch(() => {});
  }, [open, photoOptions]);

  const onCropComplete = useCallback(
    (_: Area, areaPixels: Area) => {
      setCrops((c) => ({ ...c, [device]: { ...c[device], area: areaPixels } }));
    },
    [device],
  );

  const pickPhoto = async (web_path: string) => {
    const signed = await signedUrls([web_path], 3600);
    const url = signed[web_path];
    if (!url) {
      toast.error("Não foi possível carregar a imagem");
      return;
    }
    setSourceUrl(url);
    setStep("crop");
  };

  const onUploadFile = async (file: File) => {
    setSourceUrl(URL.createObjectURL(file));
    setStep("crop");
  };

  const save = async () => {
    if (!sourceUrl) return;
    if (!crops.desktop.area || !crops.mobile.area) {
      toast.error("Recorte as duas versões (desktop e mobile) antes de salvar");
      return;
    }
    setSaving(true);
    try {
      const ts = Date.now();
      const desktopBlob = await cropToBlob(sourceUrl, crops.desktop.area, ASPECTS.desktop.w, ASPECTS.desktop.h);
      const mobileBlob = await cropToBlob(sourceUrl, crops.mobile.area, ASPECTS.mobile.w, ASPECTS.mobile.h);

      const desktopPath = paths.hero(galleryId, `cover-desktop-${ts}.webp`);
      const mobilePath = paths.hero(galleryId, `cover-mobile-${ts}.webp`);

      // upsert
      const upload = async (path: string, blob: Blob) => {
        const { error } = await supabase.storage.from(GALLERY_BUCKET).upload(path, blob, {
          cacheControl: "31536000",
          upsert: true,
          contentType: "image/webp",
        });
        if (error) throw error;
      };
      await Promise.all([upload(desktopPath, desktopBlob), upload(mobilePath, mobileBlob)]);

      // 5-year signed URLs
      const { data: dSigned } = await supabase.storage.from(GALLERY_BUCKET).createSignedUrl(desktopPath, 60 * 60 * 24 * 365 * 5);
      const { data: mSigned } = await supabase.storage.from(GALLERY_BUCKET).createSignedUrl(mobilePath, 60 * 60 * 24 * 365 * 5);
      if (!dSigned?.signedUrl || !mSigned?.signedUrl) throw new Error("Falha ao gerar links");

      onSaved({ desktopUrl: dSigned.signedUrl, mobileUrl: mSigned.signedUrl });
      toast.success("Capa atualizada!");
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar capa");
    } finally {
      setSaving(false);
    }
  };

  const a = ASPECTS[device];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Escolher e recortar capa</DialogTitle>
        </DialogHeader>

        {step === "pick" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Label htmlFor="cover-upload" className="cursor-pointer inline-flex items-center gap-2 border rounded px-3 py-2 text-sm hover:bg-accent">
                <Upload className="h-4 w-4" /> Enviar nova imagem
              </Label>
              <input
                id="cover-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onUploadFile(e.target.files[0])}
              />
              <p className="text-xs text-muted-foreground">ou escolha uma das fotos da galeria abaixo:</p>
            </div>
            {photoOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma foto na galeria. Envie uma imagem acima.</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[60vh] overflow-y-auto">
                {photoOptions.map((p) => {
                  const url = thumbUrls[p.thumb_path || p.web_path];
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => pickPhoto(p.web_path)}
                      className="aspect-square overflow-hidden rounded border hover:border-primary transition"
                    >
                      {url ? <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full bg-muted" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Tabs value={device} onValueChange={(v) => setDevice(v as DeviceKey)}>
              <TabsList className="grid grid-cols-2 w-full">
                {(Object.keys(ASPECTS) as DeviceKey[]).map((k) => {
                  const Icon = ASPECTS[k].icon;
                  const done = !!crops[k].area;
                  return (
                    <TabsTrigger key={k} value={k} className="gap-2">
                      <Icon className="h-4 w-4" />
                      {ASPECTS[k].label}
                      {done && <span className="text-[10px] text-green-600">●</span>}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {(Object.keys(ASPECTS) as DeviceKey[]).map((k) => (
                <TabsContent key={k} value={k} className="pt-3 space-y-3">
                  <div
                    className="relative w-full bg-black rounded overflow-hidden"
                    style={{ height: k === "mobile" ? 520 : 420 }}
                  >
                    {sourceUrl && (
                      <Cropper
                        image={sourceUrl}
                        crop={crops[k].crop}
                        zoom={crops[k].zoom}
                        aspect={ASPECTS[k].ratio}
                        onCropChange={(c) => setCrops((cs) => ({ ...cs, [k]: { ...cs[k], crop: c } }))}
                        onZoomChange={(z) => setCrops((cs) => ({ ...cs, [k]: { ...cs[k], zoom: z } }))}
                        onCropComplete={onCropComplete}
                        objectFit="contain"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Label className="text-xs w-16">Zoom</Label>
                    <Slider
                      min={1}
                      max={4}
                      step={0.05}
                      value={[crops[k].zoom]}
                      onValueChange={([v]) => setCrops((cs) => ({ ...cs, [k]: { ...cs[k], zoom: v } }))}
                    />
                  </div>
                </TabsContent>
              ))}
            </Tabs>
            <p className="text-xs text-muted-foreground">
              Arraste a imagem e use o zoom para enquadrar como desejar. Defina o recorte para os <strong>dois formatos</strong> antes de salvar.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === "crop" && (
            <Button variant="outline" onClick={() => setStep("pick")} disabled={saving}>
              Trocar imagem
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          {step === "crop" && (
            <Button onClick={save} disabled={saving || !crops.desktop.area || !crops.mobile.area}>
              {saving ? "Salvando..." : "Salvar capa"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
