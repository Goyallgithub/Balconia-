const DEFAULT_NUMBER = "91XXXXXXXXXX";

export function getWhatsAppNumber(): string {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP?.replace(/\D/g, "") || DEFAULT_NUMBER;
  return raw.startsWith("91") ? raw : `91${raw}`;
}

export function whatsappLink(text: string): string {
  const number = getWhatsAppNumber();
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
