// Gatilhos de WhatsApp para eventos de e-mail (aberto / clique).
// Envia automaticamente via WhatsApp Cloud API quando as credenciais existem;
// caso contrário, registra o gatilho e avisa o admin por e-mail com link pronto.

const ADMIN_EMAIL = "racunagencia@gmail.com";
const ADMIN_WHATSAPP = "554732096098";

type SupabaseLike = {
  from: (table: string) => any;
};

const firstName = (name?: string | null) =>
  (name ?? "").trim().split(/\s+/)[0] || "tudo bem";

export function buildMessage(eventType: string, name?: string | null): string {
  const n = firstName(name);
  if (eventType === "email.clicked") {
    return `Oi ${n}! Aqui é da Racun Weddings 💍 Vi que você deu uma olhada no nosso material — que bom! Quer que eu te mande a disponibilidade da sua data e os detalhes dos pacotes de foto e vídeo?`;
  }
  return `Oi ${n}! Aqui é da Racun Weddings 💍 Passando para saber se recebeu nosso e-mail. Posso te contar como funciona a nossa cobertura completa do casamento?`;
}

export function waLink(phoneE164: string, message: string): string {
  const digits = phoneE164.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

async function sendViaCloudApi(phoneE164: string, message: string) {
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneId) return { ok: false, provider: null as string | null, error: "no_credentials" };

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phoneE164.replace(/\D/g, ""),
      type: "text",
      text: { preview_url: false, body: message },
    }),
  });
  const body = await res.text();
  if (!res.ok) {
    console.error(`WhatsApp Cloud API failed [${res.status}]: ${body}`);
    return { ok: false, provider: "whatsapp_cloud_api", error: `[${res.status}] ${body}` };
  }
  return { ok: true, provider: "whatsapp_cloud_api", error: null as string | null };
}

async function alertAdmin(subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Racun Weddings <onboarding@resend.dev>",
        to: [ADMIN_EMAIL],
        subject,
        html,
      }),
    });
  } catch (e) {
    console.error("Admin alert failed", e);
  }
}

/** Handles an engagement event (open/click) coming from the Resend webhook. */
export async function handleEngagementEvent(
  supabase: SupabaseLike,
  eventType: string,
  toEmail: string | null,
) {
  if (eventType !== "email.opened" && eventType !== "email.clicked") return;
  if (!toEmail) return;

  const email = toEmail.split(",")[0].trim().toLowerCase();

  // Dedupe: no more than one trigger per e-mail + event type per 24h.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("whatsapp_triggers")
    .select("id")
    .eq("to_email", email)
    .eq("event_type", eventType)
    .gte("created_at", since)
    .limit(1);
  if (recent && recent.length > 0) return;

  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, name, phone, email")
    .ilike("email", email)
    .order("created_at", { ascending: false })
    .limit(1);
  const quote = quotes?.[0];
  if (!quote?.phone) return;

  const message = buildMessage(eventType, quote.name);
  const link = waLink(quote.phone, message);
  const sent = await sendViaCloudApi(quote.phone, message);

  await supabase.from("whatsapp_triggers").insert({
    quote_id: quote.id,
    to_email: email,
    to_phone: quote.phone,
    event_type: eventType,
    message,
    wa_link: link,
    status: sent.ok ? "sent" : sent.error === "no_credentials" ? "manual" : "failed",
    provider: sent.provider,
    error: sent.ok || sent.error === "no_credentials" ? null : sent.error,
  });

  if (!sent.ok) {
    const label = eventType === "email.clicked" ? "clicou no link" : "abriu o e-mail";
    await alertAdmin(
      `🔥 Lead quente: ${quote.name} ${label}`,
      `<h2>Lead quente 🔥</h2>
       <p><strong>${quote.name}</strong> ${label}.</p>
       <p>E-mail: ${email}<br/>WhatsApp: ${quote.phone}</p>
       <p><a href="${link}" style="background:#f60eca;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none">Responder no WhatsApp agora</a></p>
       <p style="color:#666;font-size:12px">Mensagem sugerida: ${message}</p>`,
    );
  }

  console.log(`WhatsApp trigger (${eventType}) for ${email}: ${sent.ok ? "sent" : "manual/failed"}`);
  return { adminWhatsapp: ADMIN_WHATSAPP };
}
