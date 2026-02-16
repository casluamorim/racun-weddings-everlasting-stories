import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusMap: Record<string, string> = {
  new: "Novo",
  in_conversation: "Em conversa",
  closed: "Fechado",
  lost: "Perdido",
};

const statusColors: Record<string, string> = {
  new: "bg-green-100 text-green-700",
  in_conversation: "bg-blue-100 text-blue-700",
  closed: "bg-amber-100 text-amber-700",
  lost: "bg-red-100 text-red-700",
};

const AdminQuotes = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: quotes, isLoading } = useQuery({
    queryKey: ["admin-quotes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      toast.success("Status atualizado");
    },
  });

  const filtered = quotes?.filter((q) => {
    const matchSearch = !search || q.name.toLowerCase().includes(search.toLowerCase()) || q.city?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || q.status === filterStatus;
    return matchSearch && matchStatus;
  }) ?? [];

  return (
    <div>
      <h1 className="font-heading text-2xl text-foreground mb-6">Orçamentos</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input placeholder="Buscar por nome ou cidade..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="new">Novo</SelectItem>
            <SelectItem value="in_conversation">Em conversa</SelectItem>
            <SelectItem value="closed">Fechado</SelectItem>
            <SelectItem value="lost">Perdido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground font-body text-sm">Carregando...</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground font-body text-sm">Nenhum orçamento encontrado.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <div key={q.id} className="bg-card border border-border rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <p className="font-body text-sm font-medium text-foreground">{q.name}</p>
                  <p className="font-body text-xs text-muted-foreground">
                    📱 {q.phone} • 📍 {q.city ?? "—"} • 📅 {q.wedding_date ? new Date(q.wedding_date).toLocaleDateString("pt-BR") : "—"}
                  </p>
                  {q.plan_interest && <p className="font-body text-xs text-primary mt-1">Interesse: {q.plan_interest}</p>}
                  {q.message && <p className="font-body text-xs text-muted-foreground mt-1 line-clamp-2">{q.message}</p>}
                </div>
                <Select value={q.status} onValueChange={(v) => updateStatus.mutate({ id: q.id, status: v })}>
                  <SelectTrigger className={`w-36 text-xs ${statusColors[q.status]}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusMap).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminQuotes;
