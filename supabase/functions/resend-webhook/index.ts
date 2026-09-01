import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Webhook } from "npm:svix@1.24.0";
import { handleEngagementEvent } from "./whatsapp.ts";

const SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!SECRET) {
    console.error("RESEND_WEBHOOK_SECRET is not configured");
    return new Response(JSON.stringify({ error: "not_configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const raw = await req.text();

  let event: Record<string, unknown>;
  try {
    const wh = new Webhook(SECRET);
    event = wh.verify(raw, {
      "svix-id": req.headers.get("svix-id") ?? "",
      "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
      "svix-signature": req.headers.get("svix-signature") ?? "",
    }) as Record<string, unknown>;
  } catch (err) {
    console.error("Invalid webhook signature:", err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ error: "invalid_signature" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = (event.data ?? {}) as Record<string, unknown>;
  const to = Array.isArray(data.to) ? (data.to as string[]).join(", ") : (data.to as string | undefined);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const { error } = await supabase.from("email_events").insert({
    event_type: String(event.type ?? "unknown"),
    message_id: (data.email_id as string | undefined) ?? null,
    to_email: to ?? null,
    from_email: (data.from as string | undefined) ?? null,
    subject: (data.subject as string | undefined) ?? null,
    occurred_at: (event.created_at as string | undefined) ?? new Date().toISOString(),
    payload: event,
  });

  if (error) {
    console.error("Failed to store email event:", error.message);
    return new Response(JSON.stringify({ error: "storage_failed", details: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    await handleEngagementEvent(supabase, String(event.type ?? ""), to ?? null);
  } catch (err) {
    console.error("WhatsApp trigger failed:", err instanceof Error ? err.message : err);
  }


  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
