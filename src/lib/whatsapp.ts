const WHATSAPP_NUMBER = "554732096098";

export function getWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function getPlanWhatsAppUrl(planName: string): string {
  const message = `Olá, vim pelo site da Racun Weddings. Tenho interesse no ${planName}. Minha data é ___/___/______ e será em __________. O casamento será mais intimista ou uma festa grande? Gostaria de saber sobre disponibilidade e próximos passos.`;
  return getWhatsAppUrl(message);
}

export function getFormWhatsAppUrl(data: { name: string; phone: string; date: string; ceremonyLocation: string; receptionLocation: string; guestCount: string; message: string }): string {
  const msg = `Olá, sou ${data.name}. Vim pelo site da Racun Weddings.\n\n📅 Data: ${data.date}\n💒 Local da cerimônia: ${data.ceremonyLocation}\n🥂 Local da festa: ${data.receptionLocation}\n👥 Convidados: ${data.guestCount}\n📱 WhatsApp: ${data.phone}\n\n💬 ${data.message}`;
  return getWhatsAppUrl(msg);
}

export function getGeneralWhatsAppUrl(): string {
  return getWhatsAppUrl("Olá! Vim pelo site da Racun Weddings e gostaria de conversar sobre meu casamento.");
}
