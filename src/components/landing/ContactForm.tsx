import { useRef, useState } from "react";
import { z } from "zod";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getFormWhatsAppUrl } from "@/lib/whatsapp";
import { normalizePhoneE164 } from "@/lib/phone";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AnimatedSection from "./AnimatedSection";
import { useSiteContent } from "@/hooks/useSiteContent";
import TurnstileWidget from "@/components/TurnstileWidget";

const RATE_LIMIT_KEY = "racun_contact_last_submit";
const RATE_LIMIT_MS = 60_000; // 1 min between submits
const SUBMITS_WINDOW_KEY = "racun_contact_submits";
const SUBMITS_MAX = 3; // max 3 per hour
const SUBMITS_WINDOW_MS = 60 * 60 * 1000;

const ContactForm = () => {
  const { getValue } = useSiteContent("contact");

  const sectionLabel = getValue("contact", "section_label", "Contato");
  const title = getValue("contact", "title", "Vamos conversar sobre o seu dia");
  const subtitleText = getValue(
    "contact",
    "subtitle",
    "Sediados em Blumenau (SC), atendemos casamentos em Florianópolis, Joinville, Balneário Camboriú e toda a região. Preencha o formulário e falaremos pelo WhatsApp."
  );
  const successMessage = getValue("contact", "success_message", "Orçamento enviado com sucesso!");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    date: "",
    ceremonyLocation: "",
    receptionLocation: "",
    guestCount: "",
    message: "",
  });
  const [honeypot, setHoneypot] = useState(""); // anti-bot
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const mountedAt = useRef<number>(Date.now());

  const phoneSchema = z
    .string()
    .trim()
    .min(8, "WhatsApp inválido")
    .max(20, "WhatsApp muito longo")
    .regex(/^[\d\s()+\-]{8,20}$/, "Use apenas números, espaços, +, ( ) ou -")
    .refine((v) => {
      const d = v.replace(/\D/g, "").length;
      return d >= 10 && d <= 13;
    }, { message: "Informe DDD + número (ex: (47) 99999-9999)" });

  const formSchema = z.object({
    name: z.string().trim().min(2, "Informe seu nome").max(100),
    phone: phoneSchema,
    date: z.string().trim().min(1, "Informe a data").max(20),
    ceremonyLocation: z.string().trim().min(2, "Informe o local da cerimônia").max(150),
    receptionLocation: z.string().trim().min(2, "Informe o local da festa").max(150),
    guestCount: z
      .number({ invalid_type_error: "Informe um número de convidados" })
      .int("Use um número inteiro")
      .min(1, "Mínimo de 1 convidado")
      .max(2000, "Máximo de 2000 convidados"),
    message: z.string().trim().max(1000).optional(),
  });

  const checkRateLimit = (): { ok: boolean; reason?: string } => {
    try {
      const last = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || "0", 10);
      const now = Date.now();
      if (last && now - last < RATE_LIMIT_MS) {
        const wait = Math.ceil((RATE_LIMIT_MS - (now - last)) / 1000);
        return { ok: false, reason: `Aguarde ${wait}s antes de enviar novamente.` };
      }
      const raw = localStorage.getItem(SUBMITS_WINDOW_KEY);
      const stamps: number[] = raw ? JSON.parse(raw) : [];
      const recent = stamps.filter((t) => now - t < SUBMITS_WINDOW_MS);
      if (recent.length >= SUBMITS_MAX) {
        return { ok: false, reason: "Muitos envios. Tente novamente em 1 hora." };
      }
      return { ok: true };
    } catch {
      return { ok: true };
    }
  };

  const recordSubmit = () => {
    try {
      const now = Date.now();
      localStorage.setItem(RATE_LIMIT_KEY, String(now));
      const raw = localStorage.getItem(SUBMITS_WINDOW_KEY);
      const stamps: number[] = raw ? JSON.parse(raw) : [];
      const recent = stamps.filter((t) => now - t < SUBMITS_WINDOW_MS);
      recent.push(now);
      localStorage.setItem(SUBMITS_WINDOW_KEY, JSON.stringify(recent));
    } catch {
      /* ignore */
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot: bots fill hidden fields
    if (honeypot.trim().length > 0) {
      toast.success(successMessage);
      return;
    }

    // Minimum time on form (bots submit instantly)
    if (Date.now() - mountedAt.current < 2000) {
      toast.error("Envio muito rápido. Verifique os dados e tente novamente.");
      return;
    }

    const limit = checkRateLimit();
    if (!limit.ok) {
      toast.error(limit.reason || "Aguarde antes de enviar novamente.");
      return;
    }

    const guestNumber = parseInt(form.guestCount, 10);
    const parsed = formSchema.safeParse({
      ...form,
      guestCount: Number.isFinite(guestNumber) ? guestNumber : NaN,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos do formulário.");
      return;
    }

    const phoneE164 = normalizePhoneE164(form.phone);
    if (!phoneE164) {
      toast.error("Não foi possível validar o WhatsApp. Verifique o número.");
      return;
    }

    setSending(true);

    const { error } = await supabase.from("quotes").insert({
      name: form.name.trim(),
      phone: phoneE164,
      wedding_date: form.date.trim() || null,
      city: form.ceremonyLocation.trim(),
      ceremony_location: form.ceremonyLocation.trim(),
      reception_location: form.receptionLocation.trim(),
      guest_count: parsed.data.guestCount,
      message: form.message.trim() || null,
    });

    if (error) {
      toast.error("Erro ao enviar. Tente novamente.");
      setSending(false);
      return;
    }

    recordSubmit();
    toast.success(successMessage);
    window.open(getFormWhatsAppUrl({ ...form, phone: phoneE164 }), "_blank");
    setForm({ name: "", phone: "", date: "", ceremonyLocation: "", receptionLocation: "", guestCount: "", message: "" });
    setSending(false);
  };

  return (
    <section id="contato" className="py-24 md:py-32 bg-background">
      <div className="container mx-auto px-6 max-w-2xl">
        <AnimatedSection className="text-center mb-12">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-4">{sectionLabel}</p>
          <h2 className="font-heading text-3xl md:text-5xl font-light text-foreground mb-4">{title}</h2>
          <p className="font-body text-sm text-muted-foreground">{subtitleText}</p>
        </AnimatedSection>

        <AnimatedSection>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Honeypot - hidden from real users */}
            <div aria-hidden="true" className="absolute left-[-9999px] w-px h-px overflow-hidden" tabIndex={-1}>
              <label>
                Não preencha este campo
                <input
                  type="text"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Nome *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Seu nome" maxLength={100} className="bg-background border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary" />
              </div>
              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-2 block">WhatsApp *</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" maxLength={20} className="bg-background border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Data do casamento *</label>
                <Input value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} placeholder="dd/mm/aaaa" maxLength={20} className="bg-background border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary" />
              </div>
              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Quantidade de convidados *</label>
                <Input type="number" min={1} max={2000} value={form.guestCount} onChange={(e) => setForm({ ...form, guestCount: e.target.value })} placeholder="Ex: 150" className="bg-background border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary" />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Local da cerimônia *</label>
                <Input value={form.ceremonyLocation} onChange={(e) => setForm({ ...form, ceremonyLocation: e.target.value })} placeholder="Cidade / igreja / local" maxLength={150} className="bg-background border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary" />
              </div>
              <div>
                <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Local da festa *</label>
                <Input value={form.receptionLocation} onChange={(e) => setForm({ ...form, receptionLocation: e.target.value })} placeholder="Cidade / espaço / salão" maxLength={150} className="bg-background border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary" />
              </div>
            </div>
            <div>
              <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Mensagem</label>
              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Conte um pouco sobre o seu casamento..." maxLength={1000} rows={4} className="bg-background border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary resize-none" />
            </div>
            <Button type="submit" variant="cta" size="lg" className="w-full py-6" disabled={sending}>
              <Send size={16} />
              {sending ? "Redirecionando..." : "Enviar e conversar no WhatsApp"}
            </Button>
          </form>
        </AnimatedSection>
      </div>
    </section>
  );
};

export default ContactForm;
