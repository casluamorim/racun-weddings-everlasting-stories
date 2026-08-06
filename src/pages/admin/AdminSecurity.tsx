import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { ShieldCheck, LockOpen, RefreshCw } from "lucide-react";

type Attempt = {
  scope: string;
  identifier: string;
  attempts: number;
  recent_attempts: number;
  last_attempt: string;
  locked_seconds: number;
};

type UnlockEntry = {
  id: string;
  scope: string;
  identifier: string;
  unlocked_by: string | null;
  created_at: string;
};

const scopeLabel = (scope: string) =>
  scope === "gallery_password" ? "Senha de galeria" : scope === "admin_login" ? "Login do painel" : scope;

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

const fmtLock = (secs: number) =>
  `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`;

const AdminSecurity = () => {
  const queryClient = useQueryClient();

  const { data: attempts, isLoading, refetch } = useQuery({
    queryKey: ["auth-attempts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_auth_attempts", { _limit: 200 });
      if (error) throw error;
      return (data ?? []) as Attempt[];
    },
  });

  const { data: unlocks } = useQuery({
    queryKey: ["auth-unlocks"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_unlock_log", { _limit: 100 });
      if (error) throw error;
      return (data ?? []) as UnlockEntry[];
    },
  });

  const unlock = async (scope: string, identifier: string) => {
    const { error } = await supabase.rpc("admin_clear_lockout", { _scope: scope, _identifier: identifier });
    if (error) {
      toast.error("Não foi possível desbloquear.");
      return;
    }
    toast.success(`${identifier} desbloqueado.`);
    queryClient.invalidateQueries({ queryKey: ["auth-attempts"] });
    queryClient.invalidateQueries({ queryKey: ["auth-unlocks"] });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl text-foreground flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> Segurança
          </h1>
          <p className="font-body text-sm text-muted-foreground">
            Tentativas de senha e bloqueios temporários das galerias e do login do painel.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="font-body text-sm uppercase tracking-wider text-muted-foreground">Tentativas recentes</h2>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : !attempts?.length ? (
          <p className="font-body text-sm text-muted-foreground">Nenhuma tentativa falha registrada.</p>
        ) : (
          <div className="rounded-lg border border-border divide-y divide-border">
            {attempts.map((a) => (
              <div key={`${a.scope}-${a.identifier}`} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="font-body text-sm text-foreground truncate">{a.identifier}</p>
                  <p className="font-body text-xs text-muted-foreground">
                    {scopeLabel(a.scope)} · {a.attempts} tentativa(s) · última em {fmtDate(a.last_attempt)}
                  </p>
                </div>
                {a.locked_seconds > 0 ? (
                  <Badge variant="destructive">Bloqueado ({fmtLock(a.locked_seconds)})</Badge>
                ) : (
                  <Badge variant="secondary">Livre</Badge>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => unlock(a.scope, a.identifier)}
                  aria-label={`Desbloquear ${a.identifier}`}
                >
                  <LockOpen className="mr-2 h-4 w-4" /> Desbloquear
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-body text-sm uppercase tracking-wider text-muted-foreground">Desbloqueios manuais</h2>
        {!unlocks?.length ? (
          <p className="font-body text-sm text-muted-foreground">Nenhum desbloqueio manual registrado.</p>
        ) : (
          <div className="rounded-lg border border-border divide-y divide-border">
            {unlocks.map((u) => (
              <div key={u.id} className="p-3">
                <p className="font-body text-sm text-foreground">{u.identifier}</p>
                <p className="font-body text-xs text-muted-foreground">
                  {scopeLabel(u.scope)} · desbloqueado em {fmtDate(u.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminSecurity;
