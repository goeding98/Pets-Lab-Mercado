"use server"
// "Día a día" del mensajero (/dia-a-dia, lib/routeDay.ts). Devuelven { error } en vez de lanzar: Next oculta el texto
// de los errores en producción.
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"
import { bogotaDay } from "@/lib/discounts"
import { createLabOrder } from "@/lib/createLabOrder"
import { markNotReady, markPickedUp, reopenNotReady } from "@/lib/pickups"
import { MENSAJEROS } from "@/lib/messengerRoutes"
import { COLOR_COOKIE } from "@/lib/routeDay"

async function staff() {
  const s = await getServerSession(authOptions)
  return s && can(s.user.role, "diaadia") ? s : null
}
const year = 60 * 60 * 24 * 365

export async function setDayColor(color: string): Promise<{ error?: string }> {
  if (!(await staff())) return { error: "No tienes acceso a esta sección." }
  if (!MENSAJEROS.some(m => m.nombre === color)) return { error: "Mensajero no válido." }
  cookies().set(COLOR_COOKIE, color, { httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: year })
  revalidatePath("/dia-a-dia")
  return {}
}

// Registrar una muestra en la parada (igual que "Nueva muestra", con la clínica y la sede de la parada)
export async function registerVisitSample(formData: FormData): Promise<{ error?: string; ok?: boolean; orderId?: string; orderNumber?: string; patientName?: string }> {
  const s = await staff()
  if (!s || !can(s.user.role, "muestras.crear")) return { error: "No tienes permiso para registrar muestras." }
  if (!String(formData.get("patientName") ?? "").trim() || !formData.get("species")) return { error: "Faltan el nombre o la especie." }
  if (formData.getAll("templateIds").length === 0) return { error: "Elige al menos un examen." }
  try {
    const o = await createLabOrder(s, formData)
    revalidatePath("/muestras")
    return { ok: true, orderId: o.id, orderNumber: o.orderNumber, patientName: o.patientName }
  } catch (e) {
    return { error: e instanceof Error && e.message.length < 120 ? e.message : "No se pudo registrar la muestra. Intenta de nuevo." }
  }
}

// Pedido del Portal Vet confirmado con el doctor en la parada: queda recogido (si es tarde, aplica el 50 %)
export async function confirmPickup(pickupId: string): Promise<{ error?: string; late?: boolean }> {
  const s = await staff()
  if (!s) return { error: "No tienes acceso a esta sección." }
  try {
    const r = await markPickedUp(pickupId, s.user.name ?? "Mensajero")
    revalidatePath("/muestras")
    return { late: r.late }
  } catch {
    return { error: "No se pudo confirmar. Intenta de nuevo." }
  }
}

// Cierra la parada: guarda qué pasó. Paquete no agendado = registró muestras sin pedido previo de la clínica.
export async function finishStop(v: {
  vuelta: number; color: string; clinicId: string; branchId: string | null; name: string
  result: "MUESTRAS" | "SIN_MUESTRAS" | "ESPERA" | "PEDIDO" | "NO_LISTA"; orderIds: string[]; pickupId?: string | null
}): Promise<{ error?: string }> {
  const s = await staff()
  if (!s) return { error: "No tienes acceso a esta sección." }
  try {
    if (v.result === "NO_LISTA" && v.pickupId) await markNotReady(v.pickupId, s.user.name ?? "Mensajero")
    await prisma.routeVisit.create({
      data: {
        userId: s.user.id, day: bogotaDay(), vuelta: v.vuelta, color: v.color, clinicId: v.clinicId, branchId: v.branchId, name: v.name,
        result: v.result, unscheduled: v.result === "MUESTRAS" && v.orderIds.length > 0, orderIds: v.orderIds,
        pickupId: v.pickupId ?? null,
      },
    })
    revalidatePath("/dia-a-dia")
    return {}
  } catch {
    return { error: "No hubo conexión y no se guardó. Vuelve a tocar el botón." }
  }
}

// "Devolverse": reabre la última parada cerrada en la vuelta actual (p. ej. iba saliendo y le dijeron que sí había
// muestras). Queda el motivo; la parada vuelve a ser la actual y ya no cuenta como hecha ni para el beneficio.
export async function reopenLastStop(reason: string): Promise<{ error?: string }> {
  const s = await staff()
  if (!s) return { error: "No tienes acceso a esta sección." }
  const why = reason.trim().slice(0, 300)
  if (why.length < 4) return { error: "Escribe por qué te devuelves." }
  try {
    const day = bogotaDay()
    const visits = await prisma.routeVisit.findMany({ where: { userId: s.user.id, day }, orderBy: { createdAt: "asc" } })
    const vuelta = visits.filter(v => v.result === "LAB").length + 1
    const last = visits.filter(v => v.vuelta === vuelta && v.result !== "LAB" && !v.reopenedAt).pop()
    if (!last) return { error: "No hay una parada anterior en esta vuelta." }
    await prisma.routeVisit.update({ where: { id: last.id }, data: { reopenedAt: new Date(), reopenReason: why } })
    if (last.result === "NO_LISTA" && last.pickupId) await reopenNotReady(last.pickupId)
    revalidatePath("/dia-a-dia")
    revalidatePath("/muestras")
    return {}
  } catch {
    return { error: "No hubo conexión y no se guardó. Vuelve a tocar el botón." }
  }
}

// Entregó en el laboratorio: cierra la vuelta
export async function finishRound(vuelta: number, color: string): Promise<{ error?: string }> {
  const s = await staff()
  if (!s) return { error: "No tienes acceso a esta sección." }
  try {
    await prisma.routeVisit.create({ data: { userId: s.user.id, day: bogotaDay(), vuelta, color, name: "Laboratorio", result: "LAB", orderIds: [] } })
    revalidatePath("/dia-a-dia")
    return {}
  } catch {
    return { error: "No hubo conexión y no se guardó. Vuelve a tocar el botón." }
  }
}
