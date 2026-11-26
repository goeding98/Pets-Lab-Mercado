// Recogidas pedidas por las clínicas desde el Portal Vet (modelo Pickup).
// - Garantía: se recoge antes de 1 h 30 desde que la clínica pide (solo si pide dentro del horario de garantía).
// - Si se recoge tarde: 50 % de descuento en lo recogido en esa recogida (todas sus órdenes).
// - Una recogida nueva solo 1 h después de la última solicitud de la clínica; mientras haya una pendiente, lo nuevo se
//   suma a esa misma recogida (mismo paquete, misma garantía).
// - Si el mensajero pasa y la muestra no estaba lista (NO_LISTA), se pierde la garantía de esa recogida.
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db"
import { formatTime } from "@/lib/dates"

// Cada clínica la activa el comercial ("Activar plataforma de promoción" en /clientes/[id] → Clinic.pickupsEnabled).
// Sin activar, la clínica sigue con la solicitud de siempre (sin recogida ni garantía). RECOGIDAS_PARA_TODAS = true la
// activaría para todas sin tocar cada ficha.
export const RECOGIDAS_PARA_TODAS = false
export async function pickupsEnabled(clinicId: string | null | undefined): Promise<boolean> {
  if (!clinicId) return false
  if (RECOGIDAS_PARA_TODAS) return true
  const c = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { pickupsEnabled: true } })
  return !!c?.pickupsEnabled
}

export const GARANTIA_MIN = 90
export const ESPERA_MIN = 60
export const DESCUENTO_TARDE = 50
// Horario en que se puede pedir CON garantía (hora de Colombia): lunes a sábado, 8:00 a 15:30 (así la garantía vence
// a más tardar a las 5:00 p. m.). Fuera de él la recogida queda sin garantía (deadline null) y va en la siguiente vuelta.
export const HORARIO_GARANTIA = { dias: [1, 2, 3, 4, 5, 6], desde: 8 * 60, hasta: 15 * 60 + 30, texto: "lunes a sábado de 8:00 a. m. a 3:30 p. m." }

const MIN = 60_000

// Minutos del día y día de la semana en Colombia (UTC-5, sin horario de verano)
function bogota(d: Date) {
  const local = new Date(d.getTime() - 5 * 60 * MIN)
  return { dow: local.getUTCDay(), min: local.getUTCHours() * 60 + local.getUTCMinutes() }
}

export function guaranteeDeadline(at: Date): Date | null {
  const { dow, min } = bogota(at)
  if (!HORARIO_GARANTIA.dias.includes(dow) || min < HORARIO_GARANTIA.desde || min > HORARIO_GARANTIA.hasta) return null
  return new Date(at.getTime() + GARANTIA_MIN * MIN)
}

// Desde cuándo la sede puede pedir una recogida nueva (1 h después de su última solicitud); null = ya puede
export async function nextAllowedAt(db: Prisma.TransactionClient | typeof prisma, clinicId: string, branchId: string | null, now = new Date()) {
  const last = await db.pickup.findFirst({ where: { clinicId, branchId }, orderBy: { createdAt: "desc" }, select: { createdAt: true } })
  const allowedAt = last ? new Date(last.createdAt.getTime() + ESPERA_MIN * MIN) : null
  return allowedAt && allowedAt > now ? { last: last!.createdAt, allowedAt } : null
}

// Recogida a la que va una solicitud nueva de la clínica: la pendiente de esa sede, o una nueva si ya pasó la espera
// (la espera es por sede: cada sede es otra dirección). Devuelve { error } con la hora desde la que puede volver a pedir.
// Una recogida nueva se lleva también las muestras que quedaron sin recoger porque "no estaban listas".
export async function pickupForNewRequest(
  tx: Prisma.TransactionClient,
  clinicId: string,
  branchId: string | null,
  now = new Date(),
): Promise<{ pickupId: string; added: boolean; deadline: Date | null } | { error: string }> {
  const pending = await tx.pickup.findFirst({
    where: { clinicId, status: "PENDIENTE", branchId },
    orderBy: { createdAt: "desc" },
  })
  if (pending) return { pickupId: pending.id, added: true, deadline: pending.deadline }

  const wait = await nextAllowedAt(tx, clinicId, branchId, now)
  if (wait) {
    return { error: `Ya pediste una recogida a las ${formatTime(wait.last)}; puedes pedir otra desde las ${formatTime(wait.allowedAt)}` }
  }
  const deadline = guaranteeDeadline(now)
  const p = await tx.pickup.create({ data: { clinicId, branchId, deadline, createdAt: now } })
  await tx.order.updateMany({
    where: { clinicId, branchId, status: "SOLICITADA", pickup: { status: "NO_LISTA" } },
    data: { pickupId: p.id },
  })
  return { pickupId: p.id, added: false, deadline }
}

// Marca la recogida (botón "Recogida" del laboratorio o al recibir la muestra). Si va después de la garantía, aplica el
// 50 % a todos los exámenes de sus órdenes (si ya tenían un descuento porcentual mayor, se deja ese) y lo anota en la orden.
export async function markPickedUp(pickupId: string, byName: string, at = new Date()) {
  return prisma.$transaction(async tx => {
    const p = await tx.pickup.findUnique({ where: { id: pickupId }, include: { orders: { select: { id: true, notes: true } } } })
    if (!p || p.status !== "PENDIENTE") return { late: p?.late ?? false, already: true }
    const late = !!p.deadline && at > p.deadline
    await tx.pickup.update({ where: { id: p.id }, data: { status: "RECOGIDA", pickedAt: at, pickedByName: byName, late } })
    if (late) {
      const orderIds = p.orders.map(o => o.id)
      await tx.orderExam.updateMany({
        where: { orderId: { in: orderIds }, NOT: { discountType: "PORCENTAJE", discountValue: { gte: DESCUENTO_TARDE } } },
        data: { discountType: "PORCENTAJE", discountValue: DESCUENTO_TARDE },
      })
      const note = `Recogida tarde (${formatTime(at)}; garantía hasta ${formatTime(p.deadline!)}): ${DESCUENTO_TARDE} % de descuento.`
      for (const o of p.orders) {
        await tx.order.update({ where: { id: o.id }, data: { notes: o.notes ? `${o.notes}\n${note}` : note } })
      }
    }
    return { late, already: false }
  }, { maxWait: 10000, timeout: 20000 })
}

// El mensajero se devolvió a una parada que había marcado "No estaba lista": el pedido vuelve a quedar por recoger
export async function reopenNotReady(pickupId: string) {
  await prisma.pickup.updateMany({ where: { id: pickupId, status: "NO_LISTA" }, data: { status: "PENDIENTE", pickedAt: null, pickedByName: null } })
}

export async function markNotReady(pickupId: string, byName: string, at = new Date()) {
  const r = await prisma.pickup.updateMany({
    where: { id: pickupId, status: "PENDIENTE" },
    data: { status: "NO_LISTA", pickedAt: at, pickedByName: byName },
  })
  return r.count > 0
}
