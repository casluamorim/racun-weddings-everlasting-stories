import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

const emptyForm = {
  name: "",
  phone: "",
  city: "",
  wedding_date: "",
  selectedPlans: [] as string[],
  message: "",
};

// Parses "R$ 3.499", "R$ 3.499,00", "3499.00" → number
const parsePrice = (raw?: string | null): number => {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d,.-]/g, "");
  if (!cleaned) return 0;
  // Brazilian format: dot as thousand separator, comma as decimal
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(/\.(?=\d{3}(\D|$))/g, "");
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
};

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const AdminQuotes = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: quotes, isLoading } = useQuery({
    queryKey: ["admin-quotes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["admin-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_plans")
        .select("*")
        .eq("is_active", true)
        .order("category")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const planMap = useMemo(() => {
    const m = new Map<string, { display: string; price: number; category: string }>();
    plans?.forEach((p) => {
      m.set(p.name, { display: p.display_name, price: parsePrice(p.price), category: p.category });
    });
    return m;
  }, [plans]);

  const calcTotal = (planInterest?: string | null): number => {
    if (!planInterest) return 0;
    return planInterest
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .reduce((sum, name) => sum + (planMap.get(name)?.price ?? 0), 0);
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("quotes").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-quotes-summary"] });
      toast.success("Status atualizado");
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const planInterest = form.selectedPlans.join(", ") || null;
      const { error } = await supabase.from("quotes").insert({
        name: form.name,
        phone: form.phone,
        city: form.city || null,
        wedding_date: form.wedding_date || null,
        plan_interest: planInterest,
        message: form.message || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-quotes"] });
      queryClient.invalidateQueries({ queryKey: ["admin-quotes-summary"] });
      toast.success("Orçamento adicionado!");
      setOpen(false);
      setForm(emptyForm);
    },
    onError: () => toast.error("Erro ao adicionar orçamento"),
  });

  const togglePlan = (name: string) => {
    setForm((f) => ({
      ...f,
      selectedPlans: f.selectedPlans.includes(name)
        ? f.selectedPlans.filter((p) => p !== name)
        : [...f.selectedPlans, name],
    }));
  };

  const formTotal = form.selectedPlans.reduce(
    (sum, n) => sum + (planMap.get(n)?.price ?? 0),
    0
  );

  const filtered = quotes?.filter((q) => {
    const matchSearch = !search || q.name.toLowerCase().includes(search.toLowerCase()) || q.city?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || q.status === filterStatus;
    return matchSearch && matchStatus;
  }) ?? [];

  const groupedPlans = useMemo(() => {
    const groups: Record<string, typeof plans> = { foto: [], video: [], combo: [] } as any;
    plans?.forEach((p) => {
      if (!groups[p.category]) groups[p.category] = [] as any;
      (groups[p.category] as any[]).push(p);
    });
    return groups;
  }, [plans]);

  const categoryLabels: Record<string, string> = {
    foto: "Fotografia",
    video: "Vídeo",
    combo: "Combos",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl text-foreground">Orçamentos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus size={16} className="mr-1" /> Novo Orçamento</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-heading">Adicionar Orçamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-3">
              <div>
                <Label className="font-body text-sm">Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <Label className="font-body text-sm">Telefone *</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
              </div>
              <div>
                <Label className="font-body text-sm">Cidade</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label className="font-body text-sm">Data do Casamento</Label>
                <Input type="date" value={form.wedding_date} onChange={(e) => setForm({ ...form, wedding_date: e.target.value })} />
              </div>
              <div>
                <Label className="font-body text-sm mb-2 block">Planos de Interesse</Label>
                <div className="border border-input rounded-md p-3 space-y-3 bg-background max-h-64 overflow-y-auto">
                  {!plans || plans.length === 0 ? (
                    <p className="text-xs text-muted-foreground font-body">Nenhum plano disponível.</p>
                  ) : (
                    Object.entries(groupedPlans).map(([cat, list]) =>
                      list && list.length > 0 ? (
                        <div key={cat}>
                          <p className="font-body text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                            {categoryLabels[cat]}
                          </p>
                          <div className="space-y-1.5">
                            {list.map((p: any) => (
                              <label
                                key={p.id}
                                className="flex items-center gap-2 text-sm font-body cursor-pointer hover:bg-accent/40 rounded px-1 py-0.5"
                              >
                                <Checkbox
                                  checked={form.selectedPlans.includes(p.name)}
                                  onCheckedChange={() => togglePlan(p.name)}
                                />
                                <span className="flex-1 text-foreground">{p.display_name || p.name}</span>
                                <span className="text-primary text-xs font-medium">{p.price}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : null
                    )
                  )}
                </div>
                {form.selectedPlans.length > 0 && (
                  <div className="mt-2 flex items-center justify-between bg-primary/10 rounded-md px-3 py-2">
                    <span className="font-body text-xs text-foreground">
                      {form.selectedPlans.length} plano(s) selecionado(s)
                    </span>
                    <span className="font-heading text-base text-primary">
                      Total: {formatBRL(formTotal)}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <Label className="font-body text-sm">Mensagem</Label>
                <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={3} />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>Adicionar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

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
          {filtered.map((q) => {
            const total = calcTotal(q.plan_interest);
            return (
              <div key={q.id} className="bg-card border border-border rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-body text-sm font-medium text-foreground">{q.name}</p>
                    <p className="font-body text-xs text-muted-foreground">
                      📱 {q.phone} • 📍 {q.city ?? "—"} • 📅 {q.wedding_date ? new Date(q.wedding_date).toLocaleDateString("pt-BR") : "—"}
                    </p>
                    {q.plan_interest && <p className="font-body text-xs text-primary mt-1">Interesse: {q.plan_interest}</p>}
                    {total > 0 && (
                      <p className="font-body text-xs text-foreground mt-1">
                        💰 Valor estimado: <span className="font-heading text-primary">{formatBRL(total)}</span>
                      </p>
                    )}
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
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminQuotes;
