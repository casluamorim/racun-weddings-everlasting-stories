import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.3";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const E164_RE = /^\+[1-9]\d{7,14}$/;

const BodySchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().regex(E164_RE, "phone must be E.164"),
  email: z.string().trim().email().max(150).nullable().optional(),
  wedding_date: z.string().trim().max(20).nullable().optional(),
  city: z.string().trim().max(150).nullable().optional(),
  ceremony_location: z.string().trim().max(150).nullable().optional(),
  reception_location: z.string().trim().max(150).nullable().optional(),
  guest_count: z.number().int().min(1).max(5000).nullable().optional(),
  message: z.string().trim().max(2000).nullable().optional(),
  plan_interest: z.string().trim().max(500).nullable().optional(),
  captchaToken: z.string().min(1, "captchaToken required"),
});

async function verifyTurnstile(token: string, ip: string | null): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY not configured");
    return false;
  }
  // Cloudflare test secret always passes
  const form = new FormData();
  form.append("secret", secret);
  form.append("response", token);
  if (ip) form.append("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    });
    const data = await r.json();
    return data.success === true;
  } catch (e) {
    console.error("Turnstile verify error", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: "validation_failed", details: parsed.error.flatten() }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  const data = parsed.data;

  const ip =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    null;

  const ok = await verifyTurnstile(data.captchaToken, ip);
  if (!ok) {
    return new Response(JSON.stringify({ error: "captcha_failed" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { captchaToken: _t, ...row } = data;
  const { error } = await supabase.from("quotes").insert(row);
  if (error) {
    console.error("insert error", error);
    return new Response(JSON.stringify({ error: "insert_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await notifyByEmail(row);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

async function notifyByEmail(row: Record<string, unknown>) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.error("RESEND_API_KEY not configured — skipping notification");
    return;
  }

  const esc = (v: unknown) =>
    String(v ?? "—").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const rows: [string, unknown][] = [
    ["Nome", row.name],
    ["WhatsApp", row.phone],
    ["Data do casamento", row.wedding_date],
    ["Cidade", row.city],
    ["Local (cerimônia)", row.ceremony_location],
    ["Local (recepção)", row.reception_location],
    ["Convidados", row.guest_count],
    ["Interesse", row.plan_interest],
    ["Mensagem", row.message],
  ];

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111">
      <h2 style="margin:0 0 16px">Novo contato pelo site — Racun Weddings</h2>
      <table cellpadding="8" style="border-collapse:collapse;font-size:14px">
        ${rows
          .map(
            ([k, v]) =>
              `<tr><td style="background:#f6f6f6;font-weight:bold">${k}</td><td>${esc(v)}</td></tr>`,
          )
          .join("")}
      </table>
      <p style="font-size:12px;color:#666;margin-top:16px">
        Responda pelo WhatsApp: https://wa.me/${esc(row.phone).replace(/\D/g, "")}
      </p>
    </div>`;

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Racun Weddings <onboarding@resend.dev>",
        to: ["racunagencia@gmail.com"],
        reply_to: "racunagencia@gmail.com",
        subject: `Novo lead: ${String(row.name ?? "sem nome")} — ${String(row.city ?? "")}`.trim(),
        html,
      }),
    });
    if (!r.ok) {
      console.error(`Resend failed [${r.status}]: ${await r.text()}`);
    }
  } catch (e) {
    console.error("Resend request error", e);
  }
}
