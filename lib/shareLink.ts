import { createHmac, timingSafeEqual } from "crypto"

// Enlace para compartir el PDF de una orden (o de un examen) por WhatsApp sin iniciar sesión:
// /r/<token>. El token va firmado con NEXTAUTH_SECRET (no se puede inventar ni cambiar de orden) y
// vence. La regla de pago se vuelve a revisar al abrirlo (app/r/[token]/route.ts).
export type ShareTarget = { kind: "o" | "e"; id: string } // o = orden completa, e = un examen

const SHARE_DAYS = 60
const b64 = (b: Buffer) => b.toString("base64url")
const sign = (payload: string) => b64(createHmac("sha256", process.env.NEXTAUTH_SECRET!).update(`share:${payload}`).digest()).slice(0, 22)

export function makeShareToken(target: ShareTarget): string {
  const exp = Math.floor(Date.now() / 1000) + SHARE_DAYS * 86400
  const payload = `${target.kind}.${target.id}.${exp.toString(36)}`
  return `${payload}.${sign(payload)}`
}

export function readShareToken(token: string): ShareTarget | null {
  const parts = token.split(".")
  if (parts.length !== 4) return null
  const [kind, id, exp36, sig] = parts
  const payload = `${kind}.${id}.${exp36}`
  const expected = Buffer.from(sign(payload)), got = Buffer.from(sig)
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null
  if (parseInt(exp36, 36) * 1000 < Date.now()) return null
  if (kind !== "o" && kind !== "e") return null
  return { kind, id }
}
