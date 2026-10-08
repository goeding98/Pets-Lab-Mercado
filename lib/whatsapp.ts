// Número para wa.me: solo dígitos con indicativo. Un celular colombiano de 10 dígitos (3xx…) lleva 57.
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  const d = (phone ?? "").replace(/\D/g, "")
  if (d.length === 10 && d.startsWith("3")) return `57${d}`
  if (d.length === 12 && d.startsWith("573")) return d
  if (d.length >= 11 && d.length <= 15) return d
  return null
}
