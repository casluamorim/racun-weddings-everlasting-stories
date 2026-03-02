import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";

const AdminCalendar = () => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: "", couple_names: "", notes: "" });
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const { data: dates, isLoading } = useQuery({
    queryKey: ["admin-dates"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reserved_dates").select("*").order("date");
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reserved_dates").insert({
        date: form.date,
        couple_names: form.couple_names || null,
        notes: form.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dates"] });
      toast.success("Data reservada!");
      setOpen(false);
      setForm({ date: "", couple_names: "", notes: "" });
    },
    onError: () => toast.error("Erro ao reservar data"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reserved_dates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-dates"] });
      toast.success("Data liberada");
    },
  });

  const getEventsForDate = (date: Date) => {
    return dates?.filter((d) => isSameDay(new Date(d.date + "T12:00:00"), date)) ?? [];
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { locale: ptBR });
  const calEnd = endOfWeek(monthEnd, { locale: ptBR });

  const rows: Date[][] = [];
  let day = calStart;
  while (day <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    rows.push(week);
  }

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl text-foreground">Agenda</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus size={16} className="mr-1" /> Reservar Data</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">Reservar Data</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} className="space-y-4">
              <div>
                <Label className="font-body text-sm">Data *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div>
                <Label className="font-body text-sm">Casal</Label>
                <Input value={form.couple_names} onChange={(e) => setForm({ ...form, couple_names: e.target.value })} />
              </div>
              <div>
                <Label className="font-body text-sm">Notas</Label>
                <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={createMutation.isPending}>Reservar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Calendar grid */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {/* Month navigation */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft size={18} />
          </Button>
          <h2 className="font-heading text-lg text-foreground capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight size={18} />
          </Button>
        </div>

        {/* Week header */}
        <div className="grid grid-cols-7 border-b border-border">
          {weekDays.map((wd) => (
            <div key={wd} className="text-center py-2 text-xs font-medium text-muted-foreground uppercase">
              {wd}
            </div>
          ))}
        </div>

        {/* Days */}
        {rows.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-border last:border-b-0">
            {week.map((d, di) => {
              const events = getEventsForDate(d);
              const inMonth = isSameMonth(d, currentMonth);
              const today = isToday(d);
              const selected = selectedDate && isSameDay(d, selectedDate);

              return (
                <button
                  key={di}
                  onClick={() => setSelectedDate(d)}
                  className={`relative min-h-[72px] p-1.5 text-left border-r border-border last:border-r-0 transition-colors hover:bg-accent/50
                    ${!inMonth ? "opacity-30" : ""}
                    ${selected ? "bg-accent" : ""}
                  `}
                >
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 text-sm rounded-full
                      ${today ? "bg-primary text-primary-foreground font-bold" : "text-foreground"}
                    `}
                  >
                    {format(d, "d")}
                  </span>
                  {events.length > 0 && (
                    <div className="mt-0.5 space-y-0.5">
                      {events.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          className="text-[10px] leading-tight truncate bg-primary/10 text-primary rounded px-1 py-0.5"
                        >
                          {ev.couple_names || "Reservado"}
                        </div>
                      ))}
                      {events.length > 2 && (
                        <span className="text-[10px] text-muted-foreground">+{events.length - 2} mais</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Selected date details */}
      {selectedDate && (
        <div className="mt-6">
          <h3 className="font-heading text-lg text-foreground mb-3">
            {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-muted-foreground font-body text-sm">Nenhum evento neste dia.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((ev) => (
                <div key={ev.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-body text-sm font-medium text-foreground">{ev.couple_names ?? "Sem casal definido"}</p>
                    {ev.notes && <p className="font-body text-xs text-muted-foreground">{ev.notes}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(ev.id)}>
                    <Trash2 size={16} className="text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminCalendar;
