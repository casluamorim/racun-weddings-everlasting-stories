import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

const RATE_LIMIT_KEY = "racun_contact_last_submit";
const RATE_LIMIT_MS = 60_000;
const SUBMITS_WINDOW_KEY = "racun_contact_submits";
const SUBMITS_MAX = 3;
const SUBMITS_WINDOW_MS = 60 * 60 * 1000;

// Replica da lógica do ContactForm para testes isolados
function checkRateLimit(): { ok: boolean; reason?: string } {
  try {
    const last = parseInt(localStorage.getItem(RATE_LIMIT_KEY) || "0", 10);
    const now = Date.now();
    if (last && now - last < RATE_LIMIT_MS) {
      const wait = Math.ceil((RATE_LIMIT_MS - (now - last)) / 1000);
      return { ok: false, reason: `Aguarde ${wait}s antes de enviar novamente.` };
    }
    const raw = localStorage.getItem(SUBMITS_WINDOW_KEY);
    const stamps: number[] = raw ? JSON.parse(raw) : [];
    const recent = stamps.filter((t) => now - t < SUBMITS_WINDOW_MS);
    if (recent.length >= SUBMITS_MAX) {
      return { ok: false, reason: "Muitos envios. Tente novamente em 1 hora." };
    }
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

function recordSubmit() {
  const now = Date.now();
  localStorage.setItem(RATE_LIMIT_KEY, String(now));
  const raw = localStorage.getItem(SUBMITS_WINDOW_KEY);
  const stamps: number[] = raw ? JSON.parse(raw) : [];
  const recent = stamps.filter((t) => now - t < SUBMITS_WINDOW_MS);
  recent.push(now);
  localStorage.setItem(SUBMITS_WINDOW_KEY, JSON.stringify(recent));
}

describe("rate limit do formulário de contato", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("permite o primeiro envio", () => {
    expect(checkRateLimit().ok).toBe(true);
  });

  it("bloqueia segundo envio dentro de 60s", () => {
    recordSubmit();
    vi.advanceTimersByTime(30_000);
    const r = checkRateLimit();
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/Aguarde/);
  });

  it("bloqueia envio imediatamente após o anterior", () => {
    recordSubmit();
    expect(checkRateLimit().ok).toBe(false);
  });

  it("reativa após 60s", () => {
    recordSubmit();
    vi.advanceTimersByTime(60_001);
    expect(checkRateLimit().ok).toBe(true);
  });

  it("bloqueia após 3 envios na mesma hora", () => {
    recordSubmit();
    vi.advanceTimersByTime(61_000);
    recordSubmit();
    vi.advanceTimersByTime(61_000);
    recordSubmit();
    vi.advanceTimersByTime(61_000);
    const r = checkRateLimit();
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/Muitos envios/);
  });

  it("reativa janela horária após 1h", () => {
    recordSubmit();
    vi.advanceTimersByTime(61_000);
    recordSubmit();
    vi.advanceTimersByTime(61_000);
    recordSubmit();
    vi.advanceTimersByTime(60 * 60 * 1000 + 1000);
    expect(checkRateLimit().ok).toBe(true);
  });
});
