import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "blog_session_id";

export function getBlogSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID().replace(/-/g, "");
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "anonymous-session";
  }
}

export type BlogEventType = "pageview" | "scroll" | "whatsapp_cta" | "cta_click";

export async function trackBlogEvent(
  eventType: BlogEventType,
  options: { postSlug?: string | null; value?: number } = {}
): Promise<void> {
  try {
    await supabase.from("blog_events").insert({
      event_type: eventType,
      post_slug: options.postSlug ?? null,
      path: window.location.pathname.slice(0, 300),
      value: options.value ?? null,
      session_id: getBlogSessionId(),
      referrer: document.referrer ? document.referrer.slice(0, 300) : null,
    });
  } catch {
    // analytics must never break the page
  }
}

/** Reading time in minutes, based on ~200 words per minute. */
export function getReadingMinutes(content?: string | null): number {
  if (!content) return 1;
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * Tracks scroll depth milestones (25/50/75/100%) once each.
 * Returns a cleanup function.
 */
export function trackScrollDepth(postSlug?: string | null): () => void {
  const milestones = [25, 50, 75, 100];
  const fired = new Set<number>();

  const onScroll = () => {
    const doc = document.documentElement;
    const scrollable = doc.scrollHeight - window.innerHeight;
    // Short articles that fit the viewport count as fully read.
    const pct = scrollable <= 0 ? 100 : Math.min(100, Math.round((window.scrollY / scrollable) * 100));

    for (const m of milestones) {
      if (pct >= m && !fired.has(m)) {
        fired.add(m);
        void trackBlogEvent("scroll", { postSlug, value: m });
      }
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  return () => window.removeEventListener("scroll", onScroll);
}
