"use server"
import { revalidatePath } from "next/cache"
import { del } from "@vercel/blob"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"
import { cleanColor, saveClinicLogo } from "@/lib/clinicLogo"

// Logo y colores de la clínica en sus reportes (permiso clientes.logo: ADMIN y COMERCIAL).
// Devuelven { error } en vez de lanzar: Next oculta el texto de los errores en producción.
async function allowed() {
  const session = await getServerSession(authOptions)
  return !!session && can(session.user.role, "clientes.logo")
}

// Con archivo: nuevo logo + colores. Sin archivo: solo cambia los colores del logo que ya tiene.
export async function updateClinicLogo(clinicId: string, formData: FormData): Promise<{ error?: string }> {
  if (!(await allowed())) return { error: "No tienes permiso para cambiar el logo." }
  const primary = cleanColor(formData.get("brandPrimary"))
  const accent = cleanColor(formData.get("brandAccent"))
  const file = formData.get("logo")
  try {
    if (file instanceof File && file.size > 0) {
      const r = await saveClinicLogo(clinicId, file, primary, accent)
      if (r.error) return r
    } else {
      if (!primary) return { error: "Falta el color principal." }
      const c = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { logoUrl: true } })
      if (!c?.logoUrl) return { error: "Primero sube el logo." }
      await prisma.clinic.update({ where: { id: clinicId }, data: { brandPrimary: primary, brandAccent: accent ?? primary } })
    }
  } catch {
    return { error: "No se pudo guardar el logo. Intenta de nuevo." }
  }
  revalidatePath(`/clientes/${clinicId}`)
  return {}
}

// Quita el logo: los reportes de la clínica vuelven al diseño de Pets & Lab
export async function removeClinicLogo(clinicId: string): Promise<{ error?: string }> {
  if (!(await allowed())) return { error: "No tienes permiso para cambiar el logo." }
  const c = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { logoUrl: true } })
  if (!c) return { error: "Clínica no encontrada." }
  await prisma.clinic.update({ where: { id: clinicId }, data: { logoUrl: null, brandPrimary: null, brandAccent: null } })
  if (c.logoUrl) await del(c.logoUrl).catch(() => {})
  revalidatePath(`/clientes/${clinicId}`)
  return {}
}
