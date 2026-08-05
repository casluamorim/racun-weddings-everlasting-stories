import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Mints short-lived signed URLs for gallery files.
// For password-protected galleries the caller MUST present a valid access token
// obtained from the verify_gallery_password RPC.

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json().catch(() => null);
    const slug = typeof body?.slug === "string" ? body.slug : "";
    const token = typeof body?.token === "string" ? body.token : "";
    const rawPaths = Array.isArray(body?.paths) ? body.paths : [];
    const expiresIn = Math.min(Math.max(Number(body?.expiresIn) || 3600, 60), 86400);

    if (!/^[a-z0-9-]{1,120}$/i.test(slug)) return json({ error: "invalid_slug" }, 400);
    if (rawPaths.length === 0 || rawPaths.length > 500) return json({ error: "invalid_paths" }, 400);
    const paths = rawPaths.filter((p: unknown): p is string => typeof p === "string" && p.length < 512);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: gallery } = await supabase
      .from("wedding_galleries")
      .select("id, is_password_protected")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();

    if (!gallery) return json({ error: "not_found" }, 404);

    const { data: allowed } = await supabase.rpc("gallery_access_ok", {
      _gallery_id: gallery.id,
      _token: token,
    });
    if (allowed !== true) return json({ error: "password_required" }, 401);

    // Never allow paths outside this gallery's folder
    const prefix = `${gallery.id}/`;
    const safePaths = paths.filter((p) => p.startsWith(prefix) && !p.includes(".."));
    if (safePaths.length === 0) return json({ urls: {} });

    const urls: Record<string, string> = {};
    for (let i = 0; i < safePaths.length; i += 100) {
      const chunk = safePaths.slice(i, i + 100);
      const { data } = await supabase.storage.from("galleries").createSignedUrls(chunk, expiresIn);
      data?.forEach((d) => {
        if (d.path && d.signedUrl) urls[d.path] = d.signedUrl;
      });
    }

    return json({ urls });
  } catch (_e) {
    return json({ error: "unexpected_error" }, 500);
  }
});
