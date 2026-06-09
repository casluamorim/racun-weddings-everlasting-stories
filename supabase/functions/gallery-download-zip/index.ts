import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Build a ZIP using a minimal pure-JS stream (no compression - "store" method)
// Each entry: local header + file data + central directory entry, then EOCD.

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c ^= data[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}

function encodeName(n: string): Uint8Array {
  return new TextEncoder().encode(n);
}

function num(v: number, bytes: number): Uint8Array {
  const out = new Uint8Array(bytes);
  for (let i = 0; i < bytes; i++) out[i] = (v >>> (8 * i)) & 0xff;
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) { out.set(p, off); off += p.length; }
  return out;
}

async function buildZip(files: { name: string; bytes: Uint8Array }[]): Promise<Uint8Array> {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const f of files) {
    const name = encodeName(f.name);
    const crc = crc32(f.bytes);
    const size = f.bytes.length;
    const local = concat([
      num(0x04034b50, 4), num(20, 2), num(0, 2), num(0, 2),
      num(0, 2), num(0, 2), num(crc, 4), num(size, 4), num(size, 4),
      num(name.length, 2), num(0, 2), name, f.bytes,
    ]);
    parts.push(local);
    const cent = concat([
      num(0x02014b50, 4), num(20, 2), num(20, 2), num(0, 2), num(0, 2),
      num(0, 2), num(0, 2), num(crc, 4), num(size, 4), num(size, 4),
      num(name.length, 2), num(0, 2), num(0, 2), num(0, 2), num(0, 2),
      num(0, 4), num(offset, 4), name,
    ]);
    central.push(cent);
    offset += local.length;
  }
  const centralBlob = concat(central);
  const eocd = concat([
    num(0x06054b50, 4), num(0, 2), num(0, 2),
    num(files.length, 2), num(files.length, 2),
    num(centralBlob.length, 4), num(offset, 4), num(0, 2),
  ]);
  return concat([...parts, centralBlob, eocd]);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get("slug");
    if (!slug || !/^[a-z0-9-]{1,120}$/i.test(slug)) {
      return new Response("invalid slug", { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: gallery, error: gErr } = await supabase
      .from("wedding_galleries")
      .select("id, slug, is_published, originals_removed_at")
      .eq("slug", slug)
      .eq("is_published", true)
      .maybeSingle();
    if (gErr || !gallery) return new Response("not_found", { status: 404, headers: corsHeaders });

    const { data: files } = await supabase
      .from("gallery_files")
      .select("file_name, web_path, original_path")
      .eq("gallery_id", gallery.id)
      .order("sort_order");

    if (!files?.length) return new Response("empty", { status: 404, headers: corsHeaders });

    const useOriginals = !gallery.originals_removed_at;
    const entries: { name: string; bytes: Uint8Array }[] = [];
    for (const f of files) {
      const path = useOriginals && f.original_path ? f.original_path : f.web_path;
      const { data, error } = await supabase.storage.from("galleries").download(path);
      if (error || !data) continue;
      const buf = new Uint8Array(await data.arrayBuffer());
      entries.push({ name: f.file_name || path.split("/").pop()!, bytes: buf });
    }

    await supabase.from("wedding_galleries").update({ download_count: 1 }).eq("id", gallery.id);

    const zip = await buildZip(entries);
    return new Response(zip, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${slug}.zip"`,
      },
    });
  } catch (e) {
    return new Response(`error: ${e instanceof Error ? e.message : e}`, { status: 500, headers: corsHeaders });
  }
});
