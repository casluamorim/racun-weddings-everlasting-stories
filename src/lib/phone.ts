// Normalize Brazilian phone numbers to E.164 format (+55DDDNUMBER)
export function normalizePhoneE164(input: string, defaultCountry = "55"): string | null {
  if (!input) return null;
  let digits = input.replace(/\D/g, "");
  if (!digits) return null;

  // Remove leading zeros
  digits = digits.replace(/^0+/, "");

  // If starts with country code already (55) and length matches BR (12-13)
  if (digits.startsWith(defaultCountry) && (digits.length === 12 || digits.length === 13)) {
    return `+${digits}`;
  }

  // Brazilian local: 10 (fixo) or 11 (celular) digits with DDD
  if (digits.length === 10 || digits.length === 11) {
    return `+${defaultCountry}${digits}`;
  }

  // International (8-15 digits, E.164 max 15)
  if (digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`;
  }

  return null;
}
