import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, MessageCircle, Search, MousePointerClick, MailOpen, Send, AlertTriangle } from "lucide-react";

type Quote = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  city: string | null;
  wedding_date: string | null;
  plan_interest: string | null;
  status: string;
  created_at: string;
};

type EmailEvent = {
  id: string;
  event_type: string;
  to_email: string | null;
  subject: string | null;
  occurred_at: string | null;
  created_at: string;
};

type WaTrigger = {
  id: string;
  quote_id: string | null;
  to_email: string | null;
  to_phone: string | null;
  event_type: string;
  message: string;
  wa_link: string | null;
  status: string;
  created_at: string;
};

const emailEventLabel: Record<string, string> = {
  "email.sent": "Enviado",
  "email.delivered": "Entregue",
  "email.delivery_delayed": "Atrasado",
  "email.opened": "Aberto",
  "email.clicked": "Clique",
  "email.bounced": "Bounce",
  "email.complained": "Spam",
};

const waStatusLabel: Record<string, string> = {
  sent: "Enviado automático",
  manual: "Aguardando envio manual",
  failed: "Falhou",
  pending: "Pendente",
};

const fmt = (d?: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

const norm = (e?: string | null) => (e ?? "").trim().toLowerCase();

const AdminLeads = () => {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Quote | null>(null);

  const { data: quotes, isLoading } = useQuery({
    queryKey: ["leads-quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id, name, phone, email, city, wedding_date, plan_interest, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Quote[];
    },
  });

  const { data: emailEvents } = useQuery({
    queryKey: ["leads-email-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_events")
        .select("id, event_type, to_email, subject, occurred_at, created_at")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as EmailEvent[];
    },
  });

  const { data: waTriggers } = useQuery({
    queryKey: ["leads-wa-triggers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_triggers")
        .select("id, quote_id, to_email, to_phone, event_type, message, wa_link, status, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as WaTrigger[];
    },
  });

  const emailsByAddress = useMemo(() => {
    const map = new Map<string, EmailEvent[]>();
    (emailEvents ?? []).forEach((e) => {
      norm(e.to_email)
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .forEach((addr) => {
          const list = map.get(addr) ?? [];
          list.push(e);
          map.set(addr, list);
        });
    });
    return map;
  }, [emailEvents]);

  const waByQuote = useMemo(() => {
    const map = new Map<string, WaTrigger[]>();
    (waTriggers ?? []).forEach((t) => {
      const keys = [t.quote_id ?? "", norm(t.to_email)].filter(Boolean);
      keys.forEach((k) => {
        const list = map.get(k) ?? [];
        if (!list.some((x) => x.id === t.id)) list.push(t);
        map.set(k, list);
      });
    });
    return map;
  }, [waTriggers]);

  const emailsFor = (q: Quote) => emailsByAddress.get(norm(q.email)) ?? [];
  const waFor = (q: Quote) => waByQuote.get(q.id) ?? waByQuote.get(norm(q.email)) ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return quotes ?? [];
    return (quotes ?? []).filter((q) =>
      [q.name, q.email, q.phone, q.city].some((v) => (v ?? "").toLowerCase().includes(term)),
    );
  }, [quotes, search]);

  const totals = useMemo(() => {
    const list = quotes ?? [];
    const confirmed = list.filter((q) =>
      emailsFor(q).some((e) => e.event_type === "email.delivered" || e.event_type === "email.sent"),
    ).length;
    const engaged = list.filter((q) =>
      emailsFor(q).some((e) => e.event_type === "email.opened" || e.event_type === "email.clicked"),
    ).length;
    return { total: list.length, confirmed, engaged, whats: (waTriggers ?? []).length };
  }, [quotes, emailsByAddress, waTriggers]);

  const waHref = (q: Quote, message?: string) =>
    `https://wa.me/${q.phone.replace(/\D/g, "")}${
      message ? `?text=${encodeURIComponent(message)}` : ""
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Clientes &amp; Leads</h1>
        <p className="font-body text-sm text-muted-foreground">
          Lista de clientes, e-mails confirmados e histórico de WhatsApps enviados.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Clientes", value: totals.total },
          { label: "E-mails confirmados", value: totals.confirmed },
          { label: "Abriram / clicaram", value: totals.engaged },
          { label: "WhatsApps disparados", value: totals.whats },
        ].map((c) => (
          <div key={c.label} className="rounded-lg border border-border p-4">
            <p className="font-body text-xs uppercase tracking-wider text-muted-foreground">{c.label}</p>
            <p className="font-display text-2xl">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome, e-mail, telefone ou cidade"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="font-body text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left font-body text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="p-3">Nome</th>
                <th className="p-3">E-mail</th>
                <th className="p-3">Cidade</th>
                <th className="p-3">E-mail (interações)</th>
                <th className="p-3">WhatsApp</th>
                <th className="p-3">Criado</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => {
                const ev = emailsFor(q);
                const wa = waFor(q);
                const opened = ev.filter((e) => e.event_type === "email.opened").length;
                const clicked = ev.filter((e) => e.event_type === "email.clicked").length;
                const delivered = ev.some(
                  (e) => e.event_type === "email.delivered" || e.event_type === "email.sent",
                );
                const problem = ev.some(
                  (e) => e.event_type === "email.bounced" || e.event_type === "email.complained",
                );
                return (
                  <tr key={q.id} className="border-t border-border align-middle">
                    <td className="p-3">
                      <button
                        className="text-left font-medium hover:text-primary"
                        onClick={() => setSelected(q)}
                      >
                        {q.name}
                      </button>
                      <div className="text-xs text-muted-foreground">{q.phone}</div>
                    </td>
                    <td className="p-3">
                      <span className="text-xs">{q.email ?? "—"}</span>
                      {delivered && (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          confirmado
                        </Badge>
                      )}
                      {problem && (
                        <Badge variant="destructive" className="ml-2 text-[10px]">
                          <AlertTriangle className="mr-1 h-3 w-3" /> falha
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-xs">{q.city ?? "—"}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MailOpen className="h-3.5 w-3.5" /> {opened}
                        </span>
                        <span className="flex items-center gap-1">
                          <MousePointerClick className="h-3.5 w-3.5" /> {clicked}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Send className="h-3.5 w-3.5" /> {wa.length}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{fmt(q.created_at)}</td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setSelected(q)}>
                          Histórico
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <a href={waHref(q)} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{selected?.name}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-6 font-body text-sm">
              <div className="grid grid-cols-2 gap-3">
                <p><span className="text-muted-foreground">E-mail:</span> {selected.email ?? "—"}</p>
                <p><span className="text-muted-foreground">WhatsApp:</span> {selected.phone}</p>
                <p><span className="text-muted-foreground">Cidade:</span> {selected.city ?? "—"}</p>
                <p><span className="text-muted-foreground">Data do casamento:</span> {selected.wedding_date ?? "—"}</p>
                <p className="col-span-2">
                  <span className="text-muted-foreground">Interesse:</span> {selected.plan_interest ?? "—"}
                </p>
              </div>

              <div>
                <h3 className="mb-2 flex items-center gap-2 font-medium">
                  <Mail className="h-4 w-4" /> Histórico de e-mail
                </h3>
                {emailsFor(selected).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum evento de e-mail registrado.</p>
                ) : (
                  <ul className="space-y-2">
                    {emailsFor(selected).map((e) => (
                      <li key={e.id} className="rounded border border-border p-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {emailEventLabel[e.event_type] ?? e.event_type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {fmt(e.occurred_at ?? e.created_at)}
                          </span>
                        </div>
                        {e.subject && <p className="mt-1 text-xs text-muted-foreground">{e.subject}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="mb-2 flex items-center gap-2 font-medium">
                  <MessageCircle className="h-4 w-4" /> WhatsApps disparados
                </h3>
                {waFor(selected).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum WhatsApp automático disparado.</p>
                ) : (
                  <ul className="space-y-2">
                    {waFor(selected).map((t) => (
                      <li key={t.id} className="rounded border border-border p-2">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {emailEventLabel[t.event_type] ?? t.event_type} ·{" "}
                            {waStatusLabel[t.status] ?? t.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{fmt(t.created_at)}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{t.message}</p>
                        {t.wa_link && (
                          <a
                            href={t.wa_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 inline-block text-xs text-primary underline"
                          >
                            Abrir conversa
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <Button asChild className="w-full">
                <a href={waHref(selected)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" /> Falar no WhatsApp
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminLeads;
