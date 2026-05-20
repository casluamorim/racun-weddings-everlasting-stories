import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Quote } from "lucide-react";

interface Props {
  wedding: { id: string; couple_names: string; city: string | null };
  existing: any;
  onSave: (payload: {
    weddingId: string;
    coupleName: string;
    text: string;
    location: string;
    photo_url: string;
    is_active: boolean;
    existingId?: string;
  }) => void;
  isSaving: boolean;
}

export const TestimonialEditor = ({ wedding, existing, onSave, isSaving }: Props) => {
  const [text, setText] = useState("");
  const [location, setLocation] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    setText(existing?.text ?? "");
    setLocation(existing?.location ?? wedding.city ?? "");
    setPhotoUrl(existing?.photo_url ?? "");
    setIsActive(existing?.is_active ?? true);
  }, [existing, wedding.city]);

  return (
    <div className="border-t border-border pt-6">
      <h4 className="font-heading text-sm text-foreground mb-3 flex items-center gap-2">
        <Quote size={14} /> Depoimento do casal
      </h4>
      <div className="space-y-3">
        <div>
          <Label className="font-body text-xs">Texto do depoimento</Label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="O que o casal disse sobre a experiência..."
            rows={3}
            className="text-sm"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="font-body text-xs">Cidade / Local</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Florianópolis, SC"
              className="h-9 text-sm"
            />
          </div>
          <div>
            <Label className="font-body text-xs">Foto do casal (URL)</Label>
            <Input
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
              className="h-9 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 font-body text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Exibir no site
          </label>
          <Button
            size="sm"
            disabled={isSaving}
            onClick={() =>
              onSave({
                weddingId: wedding.id,
                coupleName: wedding.couple_names,
                text,
                location,
                photo_url: photoUrl,
                is_active: isActive,
                existingId: existing?.id,
              })
            }
          >
            {isSaving ? "Salvando..." : existing ? "Atualizar depoimento" : "Salvar depoimento"}
          </Button>
        </div>
        {existing && !text.trim() && (
          <p className="font-body text-xs text-muted-foreground italic">
            Salvar com texto vazio remove o depoimento.
          </p>
        )}
      </div>
    </div>
  );
};
