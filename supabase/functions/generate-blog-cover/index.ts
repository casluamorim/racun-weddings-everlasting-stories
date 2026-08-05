import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const jsonResponse = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ error: "Server misconfigured" }, 500);
    }

    // --- Require an authenticated admin caller ---
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    if (claimsError || !userId) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const { data: isAdmin, error: roleError } = await userClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleError || isAdmin !== true) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    // --- Validate input ---
    const body = await req.json().catch(() => null);
    const postId = typeof body?.postId === "string" ? body.postId.trim() : "";
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId);
    if (!isUuid || title.length < 2 || title.length > 300) {
      return jsonResponse({ error: "postId (uuid) and title (2-300 chars) required" }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "Server misconfigured" }, 500);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Only generate for posts that actually exist
    const { data: post } = await supabase
      .from("blog_posts")
      .select("id")
      .eq("id", postId)
      .maybeSingle();
    if (!post) return jsonResponse({ error: "Post not found" }, 404);

    // Generate image using Lovable AI
    const prompt = `A beautiful, elegant, professional wedding photography blog cover image representing the topic: "${title}". Romantic, warm golden hour lighting, soft bokeh background, cinematic 16:9 aspect ratio. No text or words in the image.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return jsonResponse({ error: "Rate limit exceeded, try again later." }, 429);
      }
      if (aiResponse.status === 402) {
        return jsonResponse({ error: "Credits required. Add funds in Settings." }, 402);
      }
      return jsonResponse({ error: "Image generation failed" }, 502);
    }

    const aiData = await aiResponse.json();
    const imageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageUrl) throw new Error("No image returned from AI");

    // Extract base64 data
    const base64Match = imageUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    if (!base64Match) throw new Error("Invalid image format");

    const mimeType = `image/${base64Match[1]}`;
    const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
    const base64Data = base64Match[2];

    // Convert base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const fileName = `${postId}.${ext}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("blog-images")
      .upload(fileName, bytes, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("blog-images")
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // Update blog post
    const { error: updateError } = await supabase
      .from("blog_posts")
      .update({ cover_image_url: publicUrl })
      .eq("id", postId);

    if (updateError) throw new Error(`DB update failed: ${updateError.message}`);

    return jsonResponse({ success: true, url: publicUrl });
  } catch (e) {
    console.error("generate-blog-cover error:", e);
    return jsonResponse({ error: "Unexpected error" }, 500);
  }
});
