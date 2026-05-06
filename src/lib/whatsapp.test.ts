import { describe, it, expect } from "vitest";
import { getFormWhatsAppUrl } from "@/lib/whatsapp";

const baseData = {
  name: "Ana",
  date: "10/10/2026",
  ceremonyLocation: "Igreja",
  receptionLocation: "Salão",
  guestCount: "120",
  message: "Oi",
};

describe("getFormWhatsAppUrl", () => {
  it("usa telefone E.164 já formatado", () => {
    const url = getFormWhatsAppUrl({ ...baseData, phone: "+5547999999999" });
    expect(decodeURIComponent(url)).toContain("+5547999999999");
  });

  it("normaliza telefone BR para E.164 antes de interpolar", () => {
    const url = getFormWhatsAppUrl({ ...baseData, phone: "(47) 99999-9999" });
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain("+5547999999999");
    expect(decoded).not.toContain("(47) 99999-9999");
  });

  it("lança erro quando telefone não pode ser normalizado", () => {
    expect(() => getFormWhatsAppUrl({ ...baseData, phone: "abc" })).toThrow();
  });

  it("nunca interpola número não-E.164 cru", () => {
    const url = getFormWhatsAppUrl({ ...baseData, phone: "047999999999" });
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain("+5547999999999");
    // não deve aparecer o formato com 0 inicial
    expect(decoded).not.toMatch(/WhatsApp: 047/);
  });
});
