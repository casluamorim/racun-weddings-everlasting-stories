import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Eye, EyeOff, Film, ImageIcon, ArrowUp, ArrowDown, Home } from "lucide-react";

type MediaRow = {
  id: string;
  kind: "photo" | "video";
  preview: string;
  label: string;
  show_in_home: boolean;
  home_sort_order: number;
  couple?: string | null;
};

const getYouTubeId = (url: string) =>
  url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]+)/)?.[1] ?? "";

const AdminHome = () => {
  const queryClient = useQueryClient();

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-home-media"],
    queryFn: async (): Promise<MediaRow[]> => {
      const [{ data: photos, error: pErr }, { data: videos, error: vErr }, { data: weddings }] =
        await Promise.all([
          supabase.from("portfolio_photos").select("*"),
          supabase.from("portfolio_videos").select("*"),
          supabase.from("weddings").select("id, couple_names"),
        ]);
      if (pErr) throw pErr;
      if (vErr) throw vErr;
      const nameById = new Map((weddings || []).map((w: any) => [w.id, w.couple_names]));

      const list: MediaRow[] = [
        ...((photos || []) as any[]).map((p) => ({
          id: p.id,
          kind: "photo" as const,
          preview: p.photo_url,
          label: p.caption || "Foto",
          show_in_home: !!p.show_in_home,
          home_sort_order: p.home_sort_order ?? 0,
          couple: p.wedding_id ? nameById.get(p.wedding_id) : "Avulso",
        })),
        ...((videos || []) as any[]).map((v) => ({
          id: v.id,
          kind: "video" as const,
          preview: `https://img.youtube.com/vi/${getYouTubeId(v.youtube_url)}/mqdefault.jpg`,
          label: v.title || "Vídeo",
          show_in_home: !!v.show_in_home,
          home_sort_order: v.home_sort_order ?? 0,
          couple: v.wedding_id ? nameById.get(v.wedding_id) : "Avulso",
        })),
      ];
      return list.sort((a, b) => {
        if (a.show_in_home !== b.show_in_home) return a.show_in_home ? -1 : 1;
        return a.home_sort_order - b.home_sort_order;
      });
    },
  });

  const table = (kind: MediaRow["kind"]) => (kind === "photo" ? "portfolio_photos" : "portfolio_videos");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-home-media"] });
    queryClient.invalidateQueries({ queryKey: ["home-feed"] });
  };

  const toggleHome = useMutation({
    mutationFn: async (row: MediaRow) => {
      const { error } = await supabase
        .from(table(row.kind) as any)
        .update({ show_in_home: !row.show_in_home } as any)
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Destaque da home atualizado!");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao atualizar"),
  });

  const selected = (rows || []).filter((r) => r.show_in_home);
  const available = (rows || []).filter((r) => !r.show_in_home);

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...selected];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    await Promise.all(
      next.map((r, i) =>
        supabase
          .from(table(r.kind) as any)
          .update({ home_sort_order: i } as any)
          .eq("id", r.id)
      )
    );
    invalidate();
  };

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground mb-1 flex items-center gap-2">
        <Home size={20} /> Página Inicial
      </h1>
      <p className="font-body text-sm text-muted-foreground mb-6">
        Escolha quais fotos e vídeos aparecem no feed da home e em qual ordem.
      </p>

      {isLoading ? (
        <p className="font-body text-sm text-muted-foreground">Carregando...</p>
      ) : (
        <div className="space-y-10">
          <section>
            <h2 className="font-heading text-lg text-foreground mb-3">
              No feed da home ({selected.length})
            </h2>
            {selected.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">
                Nada selecionado ainda. Escolha abaixo.
              </p>
            ) : (
              <ul className="space-y-2">
                {selected.map((r, i) => (
                  <li
                    key={`${r.kind}-${r.id}`}
                    className="flex items-center gap-3 bg-card border border-border rounded-lg p-2"
                  >
                    <span className="font-body text-xs text-muted-foreground w-6 text-center">{i + 1}</span>
                    <img src={r.preview} alt="" className="w-16 h-16 rounded object-cover bg-muted" />
                    <div className="flex-1 min-w-0">
                      <p className="font-body text-sm text-foreground truncate flex items-center gap-1">
                        {r.kind === "video" ? <Film size={12} /> : <ImageIcon size={12} />} {r.label}
                      </p>
                      <p className="font-body text-xs text-muted-foreground truncate">{r.couple}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => move(i, -1)} disabled={i === 0}>
                      <ArrowUp size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => move(i, 1)}
                      disabled={i === selected.length - 1}
                    >
                      <ArrowDown size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" title="Remover da home" onClick={() => toggleHome.mutate(r)}>
                      <EyeOff size={16} className="text-muted-foreground" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="font-heading text-lg text-foreground mb-3">
              Disponíveis ({available.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {available.map((r) => (
                <button
                  key={`${r.kind}-${r.id}`}
                  onClick={() => toggleHome.mutate(r)}
                  className="group relative rounded-lg overflow-hidden bg-muted border border-border text-left"
                  title="Adicionar à home"
                >
                  <img src={r.preview} alt="" className="w-full aspect-square object-cover" />
                  <span className="absolute top-1 left-1 bg-background/80 rounded px-1.5 py-0.5">
                    {r.kind === "video" ? <Film size={11} /> : <ImageIcon size={11} />}
                  </span>
                  <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye size={18} className="text-primary-foreground" />
                  </span>
                  <span className="block p-1.5 font-body text-[11px] text-muted-foreground truncate">
                    {r.couple}
                  </span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default AdminHome;
