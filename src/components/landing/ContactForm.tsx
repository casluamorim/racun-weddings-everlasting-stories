import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getFormWhatsAppUrl } from "@/lib/whatsapp";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AnimatedSection from "./AnimatedSection";

const ContactForm = () => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    date: "",
    city: "",
    message: "",
  });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.date.trim() || !form.city.trim()) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setSending(true);

    // Save to database
    const { error } = await supabase.from("quotes").insert({
      name: form.name.trim(),
      phone: form.phone.trim(),
      wedding_date: form.date.trim() || null,
      city: form.city.trim(),
      message: form.message.trim() || null,
    });

    if (error) {
      toast.error("Erro ao enviar. Tente novamente.");
      setSending(false);
      return;
    }

    toast.success("Orçamento enviado com sucesso!");

    // Redirect to WhatsApp
    window.open(getFormWhatsAppUrl(form), "_blank");

    setForm({ name: "", phone: "", date: "", city: "", message: "" });
    setSending(false);
  };

  return (
    <section id="contato" className="py-24 md:py-32 bg-section-dark">
      <div className="container mx-auto px-6 max-w-2xl">
        <AnimatedSection className="text-center mb-12">
          <p className="font-body text-xs uppercase tracking-[0.3em] text-primary mb-4">Contato</p>
          <h2 className="font-heading text-3xl md:text-5xl font-light text-section-dark-foreground mb-4">
            Vamos conversar sobre o seu dia
          </h2>
          <p className="font-body text-sm text-section-dark-foreground/60">
            Preencha o formulário e falaremos pelo WhatsApp.
          </p>
        </AnimatedSection>

        <AnimatedSection>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="font-body text-xs text-section-dark-foreground/60 uppercase tracking-wider mb-2 block">
                  Nome *
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Seu nome"
                  maxLength={100}
                  className="bg-section-dark border-section-dark-foreground/20 text-section-dark-foreground placeholder:text-section-dark-foreground/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="font-body text-xs text-section-dark-foreground/60 uppercase tracking-wider mb-2 block">
                  WhatsApp *
                </label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  maxLength={20}
                  className="bg-section-dark border-section-dark-foreground/20 text-section-dark-foreground placeholder:text-section-dark-foreground/30 focus:border-primary"
                />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="font-body text-xs text-section-dark-foreground/60 uppercase tracking-wider mb-2 block">
                  Data do casamento *
                </label>
                <Input
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  placeholder="dd/mm/aaaa"
                  maxLength={20}
                  className="bg-section-dark border-section-dark-foreground/20 text-section-dark-foreground placeholder:text-section-dark-foreground/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="font-body text-xs text-section-dark-foreground/60 uppercase tracking-wider mb-2 block">
                  Cidade *
                </label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Cidade do casamento"
                  maxLength={100}
                  className="bg-section-dark border-section-dark-foreground/20 text-section-dark-foreground placeholder:text-section-dark-foreground/30 focus:border-primary"
                />
              </div>
            </div>
            <div>
              <label className="font-body text-xs text-section-dark-foreground/60 uppercase tracking-wider mb-2 block">
                Mensagem
              </label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="Conte um pouco sobre o seu casamento..."
                maxLength={1000}
                rows={4}
                className="bg-section-dark border-section-dark-foreground/20 text-section-dark-foreground placeholder:text-section-dark-foreground/30 focus:border-primary resize-none"
              />
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
