import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { screen, fireEvent, waitFor } from "@testing-library/dom";
import { toast } from "sonner";
import ContactForm from "@/components/landing/ContactForm";

// --- Mocks ---
vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

vi.mock("@/hooks/useSiteContent", () => ({
  useSiteContent: () => ({ getValue: (_s: string, _k: string, fb: string) => fb }),
}));

const invokeMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));

// Turnstile widget mock — exposes a button to simulate verify / expire
let verifyCb: ((t: string) => void) | null = null;
let expireCb: (() => void) | null = null;
vi.mock("@/components/TurnstileWidget", () => ({
  default: ({ onVerify, onExpire }: { onVerify: (t: string) => void; onExpire?: () => void }) => {
    verifyCb = onVerify;
    expireCb = onExpire ?? null;
    return (
      <div>
        <button type="button" onClick={() => onVerify("valid-token")}>
          mock-verify
        </button>
        {onExpire ? (
          <button type="button" onClick={() => onExpire()}>
            mock-expire
          </button>
        ) : null}
      </div>
    );
  },
}));

// stub window.open
const openSpy = vi.fn();
Object.defineProperty(window, "open", { writable: true, value: openSpy });

function fillForm() {
  fireEvent.change(screen.getByPlaceholderText("Seu nome"), { target: { value: "Ana" } });
  fireEvent.change(screen.getByPlaceholderText("(00) 00000-0000"), { target: { value: "(47) 99999-9999" } });
  fireEvent.change(screen.getByPlaceholderText("dd/mm/aaaa"), { target: { value: "10/10/2026" } });
  fireEvent.change(screen.getByPlaceholderText("Ex: 150"), { target: { value: "120" } });
  fireEvent.change(screen.getByPlaceholderText("Cidade / igreja / local"), { target: { value: "Igreja X" } });
  fireEvent.change(screen.getByPlaceholderText("Cidade / espaço / salão"), { target: { value: "Salão Y" } });
}

describe("ContactForm — Turnstile gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    invokeMock.mockResolvedValue({ data: { ok: true }, error: null });
    verifyCb = null;
    expireCb = null;
  });

  it("desabilita o botão de envio enquanto não há token", () => {
    render(<ContactForm />);
    const btn = screen.getByRole("button", { name: /Enviar/i });
    expect(btn).toBeDisabled();
  });

  it("bloqueia submit sem token e mostra toast de erro", async () => {
    vi.useFakeTimers();
    const { container } = render(<ContactForm />);
    // espera passar o tempo mínimo (2s) para isolar a verificação do captcha
    await act(async () => { vi.advanceTimersByTime(2500); });
    fillForm();
    // submete diretamente o form (botão está disabled, mas testamos o handler)
    const form = container.querySelector("form")!;
    await act(async () => { fireEvent.submit(form); });
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/anti-bot/i),
    );
    expect(invokeMock).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("envia quando o token está presente e válido", async () => {
    // Mock Date.now to skip the 2s minimum-on-page check without fake timers
    const realNow = Date.now;
    let t = 1_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => t);
    render(<ContactForm />);
    t += 5000; // simulate 5s on page
    fillForm();
    await act(async () => { verifyCb?.("valid-token"); });

    const btn = screen.getByRole("button", { name: /Enviar/i });
    await waitFor(() => expect(btn).not.toBeDisabled());
    await act(async () => { fireEvent.click(btn); });

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    const [fnName, opts] = invokeMock.mock.calls[0];
    expect(fnName).toBe("submit-quote");
    expect(opts.body.captchaToken).toBe("valid-token");
    expect(opts.body.phone).toBe("+5547999999999");
    Date.now = realNow;
  });

  it("bloqueia novo envio após token expirar", async () => {
    vi.useFakeTimers();
    const { container } = render(<ContactForm />);
    await act(async () => { vi.advanceTimersByTime(2500); });
    fillForm();
    await act(async () => { verifyCb?.("valid-token"); });
    // expira
    await act(async () => { expireCb?.(); });

    const btn = screen.getByRole("button", { name: /Enviar/i });
    expect(btn).toBeDisabled();

    const form = container.querySelector("form")!;
    await act(async () => { fireEvent.submit(form); });
    expect(invokeMock).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/anti-bot/i));
    vi.useRealTimers();
  });
});
