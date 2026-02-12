import { MessageCircle } from "lucide-react";
import { getGeneralWhatsAppUrl } from "@/lib/whatsapp";

const FloatingWhatsApp = () => (
  <a
    href={getGeneralWhatsAppUrl()}
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-[#25D366] hover:bg-[#20bd5a] text-primary-foreground rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-all"
    aria-label="Conversar no WhatsApp"
  >
    <MessageCircle size={26} fill="currentColor" />
  </a>
);

export default FloatingWhatsApp;
