import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Camera, MessageSquare, CalendarDays, DollarSign, TrendingUp } from "lucide-react";
import { useMemo } from "react";

const StatCard = ({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) => (
  <div className="bg-card border border-border rounded-lg p-5">
    <div className="flex items-center justify-between mb-3">
      <span className="font-body text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
    </div>
    <p className="font-heading text-3xl text-foreground">{value}</p>
  </div>
);

const parsePrice = (raw?: string | null): number => {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d,.-]/g, "");
  if (!cleaned) return 0;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned.replace(/\.(?=\d{3}(\D|$))/g, "");
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
};

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const AdminDashboard = () => {
  const { data: weddingsCount } = useQuery({
    queryKey: ["admin-weddings-count"],
    queryFn: async () => {
      const { count } = await supabase.from("weddings").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: quotesData } = useQuery({
    queryKey: ["admin-quotes-summary"],
    queryFn: async () => {
      const { data } = await supabase.from("quotes").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["admin-pricing"],
    queryFn: async () => {
      const { data } = await supabase.from("pricing_plans").select("name, price");
      return data ?? [];
    },
  });

  const { data: reservedCount } = useQuery({
    queryKey: ["admin-reserved-count"],
    queryFn: async () => {
      const { count } = await supabase.from("reserved_dates").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const planMap = useMemo(() => {
    const m = new Map<string, number>();
    plans?.forEach((p) => m.set(p.name, parsePrice(p.price)));
    return m;
  }, [plans]);

  const calcQuoteTotal = (planInterest?: string | null): number => {
    if (!planInterest) return 0;
    return planInterest
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .reduce((sum, name) => sum + (planMap.get(name) ?? 0), 0);
  };

  const newQuotes = quotesData?.filter((q) => q.status === "new").length ?? 0;
  const closedQuotes = quotesData?.filter((q) => q.status === "closed").length ?? 0;

  const closedRevenue = quotesData
    ?.filter((q) => q.status === "closed")
    .reduce((sum, q) => sum + calcQuoteTotal(q.plan_interest), 0) ?? 0;

  const openPipeline = quotesData
    ?.filter((q) => q.status === "new" || q.status === "in_conversation")
    .reduce((sum, q) => sum + calcQuoteTotal(q.plan_interest), 0) ?? 0;

  const recentQuotes = quotesData?.slice(0, 5) ?? [];

  return (
    <div>
      <h1 className="font-heading text-2xl md:text-3xl text-foreground mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <StatCard label="Casamentos" value={weddingsCount ?? 0} icon={Camera} color="bg-primary/10 text-primary" />
        <StatCard label="Novos Orçamentos" value={newQuotes} icon={MessageSquare} color="bg-green-100 text-green-600" />
        <StatCard label="Fechados" value={closedQuotes} icon={DollarSign} color="bg-amber-100 text-amber-600" />
        <StatCard label="Datas Reservadas" value={reservedCount ?? 0} icon={CalendarDays} color="bg-blue-100 text-blue-600" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <StatCard label="Faturamento Fechado" value={formatBRL(closedRevenue)} icon={DollarSign} color="bg-emerald-100 text-emerald-600" />
        <StatCard label="Pipeline em Aberto" value={formatBRL(openPipeline)} icon={TrendingUp} color="bg-purple-100 text-purple-600" />
      </div>

      <div className="bg-card border border-border rounded-lg">
        <div className="p-4 border-b border-border">
          <h2 className="font-heading text-lg text-foreground">Orçamentos Recentes</h2>
        </div>
        {recentQuotes.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground font-body">Nenhum orçamento recebido ainda.</p>
        ) : (
          <div className="divide-y divide-border">
            {recentQuotes.map((q) => {
              const total = calcQuoteTotal(q.plan_interest);
              return (
                <div key={q.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm font-medium text-foreground">{q.name}</p>
                    <p className="font-body text-xs text-muted-foreground truncate">
                      {q.city ?? "—"} • {q.plan_interest ?? "Sem plano"}
                    </p>
                  </div>
                  {total > 0 && (
                    <span className="font-heading text-sm text-primary whitespace-nowrap">{formatBRL(total)}</span>
                  )}
                  <span className={`font-body text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                    q.status === "new" ? "bg-green-100 text-green-700" :
                    q.status === "in_conversation" ? "bg-blue-100 text-blue-700" :
                    q.status === "closed" ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {q.status === "new" ? "Novo" : q.status === "in_conversation" ? "Em conversa" : q.status === "closed" ? "Fechado" : "Perdido"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
