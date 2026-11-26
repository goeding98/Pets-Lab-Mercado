// Beneficio de los mensajeros: $1.500 por cada paquete no agendado (muestras que el mensajero registró en el Día a día
// sin pedido del Portal Vet; RouteVisit.unscheduled). Se paga por mes (/beneficio-mensajeros, BonusPayment).
// Estado de cada paquete según sus órdenes:
//  - CONFIRMADO: el laboratorio ya procesó alguna (EN_PROCESO o COMPLETADA) → la muestra llegó, se paga
//  - POR_CONFIRMAR: las órdenes existen pero siguen RECIBIDA (el mensajero las registra en la calle como recibidas)
//  - ANULADO: se borraron todas sus órdenes → no se paga
import { prisma } from "@/lib/db"
import { BONO_PAQUETE } from "@/lib/routeDay"
import { bogotaDay } from "@/lib/discounts"

export type BonusStatus = "CONFIRMADO" | "POR_CONFIRMAR" | "ANULADO"
export type BonusPackage = {
  id: string; day: string; at: string; name: string; color: string; status: BonusStatus
  orders: { orderNumber: string; patientName: string; status: string }[]
}
export type BonusRow = {
  userId: string; userName: string
  confirmed: number; pending: number; annulled: number; amount: number
  packages: BonusPackage[]
  payment: { packages: number; amount: number; paidByName: string; paidAt: string } | null
}

export const thisMonth = () => bogotaDay().slice(0, 7)
export const validMonth = (m: string | undefined | null) => (m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : thisMonth())

const DONE = new Set(["EN_PROCESO", "COMPLETADA"])

export async function monthBonus(month: string, userId?: string): Promise<BonusRow[]> {
  const visits = await prisma.routeVisit.findMany({
    where: { unscheduled: true, reopenedAt: null, day: { startsWith: month + "-" }, ...(userId ? { userId } : {}) },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  })
  const orders = await prisma.order.findMany({
    where: { id: { in: visits.flatMap(v => v.orderIds) } },
    select: { id: true, orderNumber: true, patientName: true, status: true },
  })
  const byId = new Map(orders.map(o => [o.id, o]))
  const payments = await prisma.bonusPayment.findMany({ where: { month, ...(userId ? { userId } : {}) } })

  const rows = new Map<string, BonusRow>()
  for (const v of visits) {
    const os = v.orderIds.map(id => byId.get(id)).filter((o): o is NonNullable<typeof o> => !!o)
    const status: BonusStatus = !os.length ? "ANULADO" : os.some(o => DONE.has(o.status)) ? "CONFIRMADO" : "POR_CONFIRMAR"
    let r = rows.get(v.userId)
    if (!r) {
      r = { userId: v.userId, userName: v.user.name, confirmed: 0, pending: 0, annulled: 0, amount: 0, packages: [], payment: null }
      rows.set(v.userId, r)
    }
    if (status === "CONFIRMADO") r.confirmed++
    else if (status === "POR_CONFIRMAR") r.pending++
    else r.annulled++
    r.packages.push({
      id: v.id, day: v.day, at: v.createdAt.toISOString(), name: v.name, color: v.color, status,
      orders: os.map(o => ({ orderNumber: o.orderNumber, patientName: o.patientName, status: o.status })),
    })
  }
  // Un mensajero pagado sin paquetes visibles (p. ej. se borraron después) igual aparece con su pago
  for (const p of payments) {
    if (!rows.has(p.userId)) {
      const u = await prisma.user.findUnique({ where: { id: p.userId }, select: { name: true } })
      rows.set(p.userId, { userId: p.userId, userName: u?.name ?? "—", confirmed: 0, pending: 0, annulled: 0, amount: 0, packages: [], payment: null })
    }
  }
  for (const r of rows.values()) {
    r.amount = r.confirmed * BONO_PAQUETE
    const p = payments.find(x => x.userId === r.userId)
    if (p) r.payment = { packages: p.packages, amount: p.amount, paidByName: p.paidByName, paidAt: p.paidAt.toISOString() }
  }
  return Array.from(rows.values()).sort((a, b) => b.amount - a.amount || a.userName.localeCompare(b.userName))
}
