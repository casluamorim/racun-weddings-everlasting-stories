import { describe, it, expect } from "vitest";
import { normalizePhoneE164 } from "@/lib/phone";

describe("normalizePhoneE164", () => {
  describe("celulares brasileiros (11 dígitos com DDD)", () => {
    it("formata com parênteses e traço", () => {
      expect(normalizePhoneE164("(47) 99999-9999")).toBe("+5547999999999");
    });
    it("apenas dígitos", () => {
      expect(normalizePhoneE164("47999999999")).toBe("+5547999999999");
    });
    it("com espaços", () => {
      expect(normalizePhoneE164("47 9 9999 9999")).toBe("+5547999999999");
    });
    it("com 0 inicial no DDD", () => {
      expect(normalizePhoneE164("047999999999")).toBe("+5547999999999");
    });
    it("com 0 inicial e formatação", () => {
      expect(normalizePhoneE164("(047) 99999-9999")).toBe("+5547999999999");
    });
  });

  describe("fixos brasileiros (10 dígitos com DDD)", () => {
    it("formato padrão", () => {
      expect(normalizePhoneE164("(47) 3209-6098")).toBe("+554732096098");
    });
    it("apenas dígitos", () => {
      expect(normalizePhoneE164("4732096098")).toBe("+554732096098");
    });
    it("com 0 inicial", () => {
      expect(normalizePhoneE164("04732096098")).toBe("+554732096098");
    });
  });

  describe("já com código do país", () => {
    it("com +55", () => {
      expect(normalizePhoneE164("+55 47 99999-9999")).toBe("+5547999999999");
    });
    it("com 55 sem +", () => {
      expect(normalizePhoneE164("5547999999999")).toBe("+5547999999999");
    });
    it("fixo com 55", () => {
      expect(normalizePhoneE164("554732096098")).toBe("+554732096098");
    });
  });

  describe("inválidos", () => {
    it("string vazia", () => {
      expect(normalizePhoneE164("")).toBeNull();
    });
    it("muito curto", () => {
      expect(normalizePhoneE164("1234")).toBeNull();
    });
    it("muito longo", () => {
      expect(normalizePhoneE164("1234567890123456")).toBeNull();
    });
    it("apenas letras", () => {
      expect(normalizePhoneE164("abcdefg")).toBeNull();
    });
  });
});
