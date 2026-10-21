import { prisma } from "./db"

// Descuentos por cliente (ClinicDiscount): un % para los exámenes de ciertas áreas (vacío = todos) en una ventana
// de fechas. Se aplican al poner el precio de un examen en una orden (crear, agregar o cambiar examen); si hay
// varios que aplican, gana el mayor. Después Caja lo puede editar como cualquier descuento.

const TZ = "America/Bogota"
export const bogotaDay = (d: Date = new Date()) => d.toLocaleDateString("en-CA", { timeZone: TZ })

export type DiscountStatus = "vigente" | "programado" | "vencido"
export function discountStatus(d: { startDate: string; endDate: string }, day = bogotaDay()): DiscountStatus {
  if (day < d.startDate) return "programado"
  if (day > d.endDate) return "vencido"
  return "vigente"
}

// % de descuento de cada examen para una orden de esta clínica registrada en `at`
export async function discountsFor(clinicId: string | null, templateIds: string[], at: Date = new Date()): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (!clinicId || templateIds.length === 0) return out
  const day = bogotaDay(at)
  const rules = await prisma.clinicDiscount.findMany({ where: { clinicId, startDate: { lte: day }, endDate: { gte: day } } })
  if (rules.length === 0) return out
  const templates = await prisma.examTemplate.findMany({ where: { id: { in: templateIds } }, select: { id: true, area: true } })
  for (const t of templates) {
    const pct = Math.max(0, ...rules.filter(r => r.areas.length === 0 || r.areas.includes(t.area)).map(r => r.percent))
    if (pct > 0) out.set(t.id, pct)
  }
  return out
}

// Campos de precio de un OrderExam con el descuento del cliente (si aplica)
export const priceFields = (price: number, pct: number | undefined) =>
  pct ? { price, discountType: "PORCENTAJE", discountValue: pct } : { price, discountType: "VALOR", discountValue: 0 }
