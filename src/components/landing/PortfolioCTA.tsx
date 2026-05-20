import { useRef, useState } from "react";
import { z } from "zod";
import { Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { normalizePhoneE164 } from "@/lib/phone";
import { getWhatsAppUrl, getGeneralWhatsAppUrl } from "@/lib/whatsapp";
import AnimatedSection from "./AnimatedSection";
import TurnstileWidget from "@/components/TurnstileWidget";

const RATE_LIMIT_KEY = "racun_portfolio_last_submit";
const RATE_LIMIT_MS = 60_000;

const PortfolioCTA = () => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    date: "",
    city: "",
    venue: "",
    referral: "",
    message: "",
  });
  const [honeypot, setHoneypot] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const mountedAt = useRef<number>(Date.now());

  const schema = z.object({
    name: z.string().trim().min(2, "Informe o nome do casal").max(100),
    phone: z
      .string()
      .trim()
      .min(8, "WhatsApp inválido")
      .max(20)
      .regex(/^[\d\s()+\-]{8,20}$/, "Use apenas números, espaços, +, ( ) ou -")
      .refine((v) => {
        const d = v.replace(/\D/g, "").length;
        return d >= 10 && d <= 13;
      }, { message: "Informe DDD + número (ex: (47) 99999-9999)" }),
    date: z.string().trim().min(1, "Informe a data").max(20),
    city: z.string().trim().min(2, "Informe a cidade").max(150),
    venue: z.string().trim().min(2, "Informe o local").max(150),
    referral: z.string().trim().min(2, "Como conheceu a Racun?").max(150),
    message: z.string().trim().max(900).optional(),
  });

  const buildWaMessage = (phoneE164: string) =>
    `Olá! Acabei de preencher o formulário no site da Racun Weddings.\n\nNome do casal: ${form.name}\nWhatsApp: ${phoneE164}\nData do casamento: ${form.date}\nCidade: ${form.city}\nLocal do casamento: ${form.venue}\nConheci vocês por: ${form.referral}\n\nSobre nosso casamento:\n${form.message || "—"}\n\nGostaria de solicitar um orçamento.`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (honeypot.trim().length > 0) return;
    if (Date.now() - mountedAt.current < 2000) {
      toast.error("Envio muito rápido. Verifique os dados e tente novamente.");
      return;
    }

    try {
      const last = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || "0", 10);
      if (last && Date.now() - last < RATE_LIMIT_MS) {
        const wait = Math.ceil((RATE_LIMIT_MS - (Date.now() - last)) / 1000);
        toast.error(`Aguarde ${wait}s antes de enviar novamente.`);
        return;
      }
    } catch { /* ignore */ }

    if (!captchaToken) {
      toast.error("Confirme o desafio anti-bot antes de enviar.");
      return;
    }

    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os campos.");
      return;
    }

    const phoneE164 = normalizePhoneE164(form.phone);
    if (!phoneE164) {
      toast.error("Não foi possível validar o WhatsApp.");
      return;
    }

    setSending(true);

    const fullMessage =
      `[Origem: Portfólio Weddings] Como conheceu: ${form.referral}.` +
      (form.message ? ` Sobre: ${form.message.slice(0, 800)}` : "");

    const { data: fnData, error: fnError } = await supabase.functions.invoke("submit-quote", {
      body: {
        name: form.name.trim(),
        phone: phoneE164,
        wedding_date: form.date.trim() || null,
        city: form.city.trim(),
        ceremony_location: form.venue.trim(),
        reception_location: form.venue.trim(),
        message: fullMessage.slice(0, 1000),
        plan_interest: "Portfólio Weddings",
        captchaToken,
      },
    });

    if (fnError || (fnData && (fnData as { error?: string }).error)) {
      toast.error("Não foi possível registrar seu pedido. Tente novamente em instantes.");
      setCaptchaToken(null);
      if (typeof window !== "undefined" && (window as any).turnstile) {
        try { (window as any).turnstile.reset(); } catch { /* ignore */ }
      }
      setSending(false);
      return;
    }

    try { localStorage.setItem(RATE_LIMIT_KEY, String(Date.now())); } catch { /* ignore */ }

    toast.success("Pedido enviado! Abrindo WhatsApp...");
    try {
      window.open(getWhatsAppUrl(buildWaMessage(phoneE164)), "_blank");
    } catch { /* ignore */ }

    setForm({ name: "", phone: "", date: "", city: "", venue: "", referral: "", message: "" });
    setCaptchaToken(null);
    if (typeof window !== "undefined" && (window as any).turnstile) {
      try { (window as any).turnstile.reset(); } catch { /* ignore */ }
    }
    setSending(false);
  };

  return (
    <section className="py-24 md:py-32 bg-section-dark">
      <div className="container mx-auto px-6 max-w-2xl">
        <AnimatedSection className="text-center mb-12">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-4">Vamos conversar</p>
          <h2 className="font-heading text-3xl md:text-5xl font-light text-section-dark-foreground mb-4">
            Seu casamento merece ser contado da forma certa.
          </h2>
          <p className="font-body text-sm text-section-dark-foreground/70">
            Vamos criar um filme que faça vocês reviverem esse momento para sempre.
          </p>
        </AnimatedSection>

        <AnimatedSection>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div aria-hidden="true" className="absolute left-[-9999px] w-px h-px overflow-hidden" tabIndex={-1}>
              <label>
                Não preencha
                <input type="text" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="font-body text-xs text-section-dark-foreground/60 uppercase tracking-wider mb-2 block">Nome do casal *</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="João & Maria" maxLength={100} />
              </div>
              <div>
                <label className="font-body text-xs text-section-dark-foreground/60 uppercase tracking-wider mb-2 block">WhatsApp *</label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" maxLength={20} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="font-body text-xs text-section-dark-foreground/60 uppercase tracking-wider mb-2 block">Data do casamento *</label>
                <Input value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} placeholder="dd/mm/aaaa" maxLength={20} />
              </div>
              <div>
                <label className="font-body text-xs text-section-dark-foreground/60 uppercase tracking-wider mb-2 block">Cidade do evento *</label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Florianópolis" maxLength={150} />
              </div>
            </div>
            <div>
              <label className="font-body text-xs text-section-dark-foreground/60 uppercase tracking-wider mb-2 block">Local do casamento *</label>
              <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} placeholder="Espaço / igreja / salão" maxLength={150} />
            </div>
            <div>
              <label className="font-body text-xs text-section-dark-foreground/60 uppercase tracking-wider mb-2 block">Como conheceu a Racun Weddings? *</label>
              <Input value={form.referral} onChange={(e) => setForm({ ...form, referral: e.target.value })} placeholder="Instagram, indicação, Google..." maxLength={150} />
            </div>
            <div>
              <label className="font-body text-xs text-section-dark-foreground/60 uppercase tracking-wider mb-2 block">Conte um pouco sobre o casamento</label>
              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Estilo, expectativas, momentos especiais..." maxLength={900} rows={4} className="resize-none" />
            </div>

            <div className="pt-2">
              <TurnstileWidget onVerify={(t) => setCaptchaToken(t)} onExpire={() => setCaptchaToken(null)} />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <Button type="submit" variant="cta" size="lg" className="w-full py-6" disabled={sending || !captchaToken}>
                <Send size={16} />
                {sending ? "Enviando..." : "Solicitar orçamento"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full py-6"
                onClick={() => window.open(getGeneralWhatsAppUrl(), "_blank")}
              >
                <MessageCircle size={16} />
                Falar no WhatsApp
              </Button>
            </div>
          </form>
        </AnimatedSection>
      </div>
    </section>
  );
};

export default PortfolioCTA;
