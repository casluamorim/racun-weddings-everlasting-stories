import { normalizePhoneE164 } from "@/lib/phone";

const WHATSAPP_NUMBER = "554732096098";
const E164_RE = /^\+[1-9]\d{7,14}$/;

export function getWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function getPlanWhatsAppUrl(planName: string): string {
  const message = `Olá, vim pelo site da Racun Weddings. Tenho interesse no ${planName}. Minha data é ___/___/______ e será em __________. O casamento será mais intimista ou uma festa grande? Gostaria de saber sobre disponibilidade e próximos passos.`;
  return getWhatsAppUrl(message);
}

/**
 * Builds the WhatsApp URL using STRICT E.164 phone. Throws if phone isn't E.164.
 * This guarantees we never interpolate an unnormalized number into the message.
 */
export function getFormWhatsAppUrl(data: {
  name: string;
  phone: string; // must already be E.164
  date: string;
  ceremonyLocation: string;
  receptionLocation: string;
  guestCount: string;
  message: string;
}): string {
  let phoneE164 = data.phone;
  if (!E164_RE.test(phoneE164)) {
    const normalized = normalizePhoneE164(phoneE164);
    if (!normalized || !E164_RE.test(normalized)) {
      throw new Error("Phone must be a valid E.164 number");
    }
    phoneE164 = normalized;
  }
  const msg = `Olá, sou ${data.name}. Vim pelo site da Racun Weddings.\n\n📅 Data: ${data.date}\n💒 Local da cerimônia: ${data.ceremonyLocation}\n🥂 Local da festa: ${data.receptionLocation}\n👥 Convidados: ${data.guestCount}\n📱 WhatsApp: ${phoneE164}\n\n💬 ${data.message}`;
  return getWhatsAppUrl(msg);
}

export function getGeneralWhatsAppUrl(): string {
  return getWhatsAppUrl("Olá! Vim pelo site da Racun Weddings e gostaria de conversar sobre meu casamento.");
}
