import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ConfirmedLead = {
  city: string | null;
  created_at: string;
};

const dayKey = (iso: string) => iso.slice(0, 10);

const fmtDay = (key: string) => {
  const [, m, d] = key.split("-");
  return `${d}/${m}`;
};

const LeadsCharts = ({ leads }: { leads: ConfirmedLead[] }) => {
  const byCity = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach((l) => {
      const city = (l.city ?? "").trim() || "Não informado";
      map.set(city, (map.get(city) ?? 0) + 1);
    });
    return [...map.entries()]
      .map(([city, total]) => ({ city, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [leads]);

  const byDate = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach((l) => {
      const key = dayKey(l.created_at);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-30)
      .map(([key, total]) => ({ date: fmtDay(key), total }));
  }, [leads]);

  if (!leads.length) {
    return (
      <div className="rounded-lg border border-border p-6 text-center font-body text-sm text-muted-foreground">
        Ainda não há leads confirmados para exibir nos gráficos.
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-border p-4">
        <h2 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-4">
          Leads confirmados por cidade
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCity} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="city"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={60}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v} leads`, "Confirmados"]}
              />
              <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-lg border border-border p-4">
        <h2 className="font-body text-xs uppercase tracking-wider text-muted-foreground mb-4">
          Leads confirmados por data (últimos 30 dias com registro)
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={byDate} margin={{ left: -20, right: 8, top: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v} leads`, "Confirmados"]}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default LeadsCharts;
