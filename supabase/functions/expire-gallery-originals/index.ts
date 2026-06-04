import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: expired } = await supabase
    .from("wedding_galleries")
    .select("id")
    .lte("originals_expire_at", new Date().toISOString())
    .eq("keep_originals_forever", false)
    .is("originals_removed_at", null);

  const processed: string[] = [];
  for (const g of expired ?? []) {
    const { data: files } = await supabase
      .from("gallery_files")
      .select("id, original_path")
      .eq("gallery_id", g.id)
      .not("original_path", "is", null);

    const toRemove = (files ?? []).map((f) => f.original_path!).filter(Boolean);
    if (toRemove.length) {
      // remove in chunks
      for (let i = 0; i < toRemove.length; i += 100) {
        await supabase.storage.from("galleries").remove(toRemove.slice(i, i + 100));
      }
    }
    // Null out original_path so app stops offering originals
    await supabase.from("gallery_files").update({ original_path: null }).eq("gallery_id", g.id);
    await supabase.from("wedding_galleries").update({ originals_removed_at: new Date().toISOString() }).eq("id", g.id);
    processed.push(g.id);
  }

  return new Response(JSON.stringify({ processed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
