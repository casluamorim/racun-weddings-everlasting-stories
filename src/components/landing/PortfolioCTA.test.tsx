import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, act } from "@testing-library/react";
import { screen, fireEvent, waitFor } from "@testing-library/dom";
import { toast } from "sonner";
import PortfolioCTA from "@/components/landing/PortfolioCTA";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

const invokeMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invokeMock(...args) } },
}));

let verifyCb: ((t: string) => void) | null = null;
vi.mock("@/components/TurnstileWidget", () => ({
  default: ({ onVerify }: { onVerify: (t: string) => void }) => {
    verifyCb = onVerify;
    return <div data-testid="turnstile-mock" />;
  },
}));

const openSpy = vi.fn();
Object.defineProperty(window, "open", { writable: true, value: openSpy });

function fill() {
  fireEvent.change(screen.getByPlaceholderText("João & Maria"), { target: { value: "Ana & Bia" } });
  fireEvent.change(screen.getByPlaceholderText("(00) 00000-0000"), { target: { value: "(47) 99999-9999" } });
  fireEvent.change(screen.getByPlaceholderText("dd/mm/aaaa"), { target: { value: "10/10/2026" } });
  fireEvent.change(screen.getByPlaceholderText("Florianópolis"), { target: { value: "Floripa" } });
  fireEvent.change(screen.getByPlaceholderText("Espaço / igreja / salão"), { target: { value: "Salão" } });
  fireEvent.change(screen.getByPlaceholderText("Instagram, indicação, Google..."), { target: { value: "Instagram" } });
}

describe("PortfolioCTA — CRM → WhatsApp ordering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    verifyCb = null;
  });

  it("salva o lead no CRM antes de abrir o WhatsApp", async () => {
    const callOrder: string[] = [];
    invokeMock.mockImplementation(async () => {
      callOrder.push("crm");
      return { data: { ok: true }, error: null };
    });
    openSpy.mockImplementation(() => {
      callOrder.push("whatsapp");
      return null;
    });

    render(<PortfolioCTA />);
    await new Promise((r) => setTimeout(r, 2100));
    fill();
    await act(async () => { verifyCb?.("valid-token"); });

    const btn = screen.getByRole("button", { name: /Solicitar orçamento/i });
    await waitFor(() => expect(btn).not.toBeDisabled());
    await act(async () => { fireEvent.click(btn); });

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(openSpy).toHaveBeenCalled());
    expect(callOrder).toEqual(["crm", "whatsapp"]);

    // WhatsApp URL contém telefone normalizado E.164
    const url = openSpy.mock.calls[0][0] as string;
    expect(decodeURIComponent(url)).toContain("+5547999999999");
    expect(url).toMatch(/wa\.me\/554732096098/);
  }, 10000);

  it("NÃO abre o WhatsApp se o CRM falhar", async () => {
    invokeMock.mockResolvedValue({ data: null, error: { message: "boom" } });

    render(<PortfolioCTA />);
    await new Promise((r) => setTimeout(r, 2100));
    fill();
    await act(async () => { verifyCb?.("valid-token"); });

    const btn = screen.getByRole("button", { name: /Solicitar orçamento/i });
    await waitFor(() => expect(btn).not.toBeDisabled());
    await act(async () => { fireEvent.click(btn); });

    await waitFor(() => expect(invokeMock).toHaveBeenCalled());
    expect(openSpy).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  }, 10000);

  it("NÃO abre o WhatsApp se a função retornar { error }", async () => {
    invokeMock.mockResolvedValue({ data: { error: "captcha_failed" }, error: null });

    render(<PortfolioCTA />);
    await new Promise((r) => setTimeout(r, 2100));
    fill();
    await act(async () => { verifyCb?.("valid-token"); });

    const btn = screen.getByRole("button", { name: /Solicitar orçamento/i });
    await waitFor(() => expect(btn).not.toBeDisabled());
    await act(async () => { fireEvent.click(btn); });

    await waitFor(() => expect(invokeMock).toHaveBeenCalled());
    expect(openSpy).not.toHaveBeenCalled();
  }, 10000);
});
