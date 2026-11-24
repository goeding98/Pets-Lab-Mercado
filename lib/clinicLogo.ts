// Logo de la clínica para sus reportes (Clinic.logoUrl, Blob privado). Solo servidor.
import { del, put } from "@vercel/blob"
import { randomUUID } from "crypto"
import { prisma } from "@/lib/db"
import { HEX } from "@/lib/brandColors"

export const LOGO_MAX_BYTES = 900 * 1024 // el navegador lo reduce antes (límite de 1 MB de las server actions)
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

// Ancho y alto de un PNG (cabecera IHDR); null si no es un PNG
export function pngSize(bytes: Uint8Array): { w: number; h: number } | null {
  if (bytes.length < 24 || PNG_SIGNATURE.some((b, i) => bytes[i] !== b)) return null
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const w = dv.getUint32(16), h = dv.getUint32(20)
  return w > 0 && h > 0 ? { w, h } : null
}

export function cleanColor(v: FormDataEntryValue | null): string | null {
  return typeof v === "string" && HEX.test(v.trim()) ? v.trim().toLowerCase() : null
}

// Guarda el logo (PNG ya recortado y reducido en el navegador) y los colores; borra el logo anterior.
export async function saveClinicLogo(clinicId: string, file: File, primary: string | null, accent: string | null): Promise<{ error?: string }> {
  if (file.size > LOGO_MAX_BYTES) return { error: "El logo pesa demasiado. Prueba con una imagen más pequeña." }
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!pngSize(bytes)) return { error: "El logo no se pudo leer. Sube una imagen PNG o JPG." }
  if (!primary) return { error: "Falta el color principal." }

  const current = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { logoUrl: true } })
  if (!current) return { error: "Clínica no encontrada." }

  const blob = await put(`logos/${clinicId}-${randomUUID()}.png`, Buffer.from(bytes), { access: "private", contentType: "image/png" })
  await prisma.clinic.update({ where: { id: clinicId }, data: { logoUrl: blob.url, brandPrimary: primary, brandAccent: accent ?? primary } })
  if (current.logoUrl) await del(current.logoUrl).catch(() => {})
  return {}
}
