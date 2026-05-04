import { useEffect, useRef } from "react";

// Cloudflare test key that always passes — replace with VITE_TURNSTILE_SITE_KEY in env
const TEST_SITE_KEY = "1x00000000000000000000AA";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

let scriptLoading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise<void>((resolve) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
  return scriptLoading;
}

interface Props {
  onVerify: (token: string) => void;
  onExpire?: () => void;
}

const TurnstileWidget = ({ onVerify, onExpire }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || TEST_SITE_KEY;

  useEffect(() => {
    let cancelled = false;
    loadScript().then(() => {
      if (cancelled || !ref.current || !window.turnstile) return;
      widgetIdRef.current = window.turnstile.render(ref.current, {
        sitekey: siteKey,
        theme: "auto",
        callback: (token: string) => onVerify(token),
        "expired-callback": () => onExpire?.(),
      });
    });
    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref} className="flex justify-center" />;
};

export default TurnstileWidget;
