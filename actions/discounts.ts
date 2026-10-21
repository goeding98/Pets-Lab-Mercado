"use server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"

// Descuentos por cliente (/descuentos): ADMIN y COMERCIAL. Se aplican solos a las órdenes nuevas del cliente
// dentro de la ventana de fechas (lib/discounts.ts); crear o borrar uno no cambia órdenes ya registradas.

async function requireDiscounts() {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "descuentos")) throw new Error("No autorizado")
  return session
}

const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)

export async function createDiscount(d: { clinicId: string; percent: number; areas: string[]; startDate: string; endDate: string; note: string }): Promise<{ error?: string }> {
  const session = await requireDiscounts()
  const percent = Math.round(Number(d.percent) * 100) / 100
  if (!d.clinicId) return { error: "Elige el cliente." }
  if (!(percent > 0 && percent <= 100)) return { error: "El descuento debe ser mayor que 0 y hasta 100%." }
  if (!isDay(d.startDate) || !isDay(d.endDate)) return { error: "Elige las fechas desde y hasta." }
  if (d.endDate < d.startDate) return { error: "La fecha final no puede ser antes de la inicial." }
  const clinic = await prisma.clinic.findUnique({ where: { id: d.clinicId }, select: { noCharge: true } })
  if (!clinic) return { error: "El cliente no existe." }
  if (clinic.noCharge) return { error: "Este cliente no se cobra: no necesita descuentos." }
  const areas = Array.from(new Set(d.areas.map(a => a.trim()).filter(Boolean)))
  await prisma.clinicDiscount.create({
    data: { clinicId: d.clinicId, percent, areas, startDate: d.startDate, endDate: d.endDate, note: d.note.trim() || null, createdByName: session.user.name ?? null },
  })
  revalidatePath("/descuentos")
  return {}
}

export async function deleteDiscount(id: string): Promise<{ error?: string }> {
  await requireDiscounts()
  await prisma.clinicDiscount.deleteMany({ where: { id } })
  revalidatePath("/descuentos")
  return {}
}
