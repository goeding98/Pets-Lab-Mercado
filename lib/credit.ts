// Líneas de crédito y cartera. Una orden está a crédito si Order.creditDays no es null (se elige en el pago de la
// muestra, en "Nueva muestra" o en Caja, solo si el cliente tiene línea activa). Vence a creditDays de la fecha de
// su factura (o de su registro si aún no se factura). Mora = alguna orden a crédito con saldo y ya vencida: mientras
// el cliente esté en mora sus órdenes a crédito sin pagar quedan retenidas (lib/payment.ts: orderPayment).
import { prisma } from "./db"
import { computeNetPrice } from "./billing"
import { orderPayment, type PayableExam } from "./payment"

const TZ = "America/Bogota"
export const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ })
export const todayKey = () => dayKey(new Date())
export function addDays(key: string, n: number) {
  const d = new Date(`${key}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
export function daysBetween(from: string, to: string) {
  return Math.round((new Date(`${to}T12:00:00Z`).getTime() - new Date(`${from}T12:00:00Z`).getTime()) / 86400000)
}

export const CREDIT_TERMS = [15, 30] as const
export const CREDIT_LIMITS = Array.from({ length: 10 }, (_, i) => (i + 1) * 1_000_000)

type DueInput = { creditDays: number | null; invoicedAt: Date | null; invoiceNumber: string | null; createdAt: Date }
// Fecha de la factura (si ya se emitió) o del registro + plazo
export function invoiceDay(o: DueInput) {
  const invoiced = o.invoicedAt && o.invoiceNumber && !o.invoiceNumber.startsWith("EMITIENDO")
  return dayKey(invoiced ? o.invoicedAt! : o.createdAt)
}
export function dueDateOf(o: DueInput) {
  return o.creditDays == null ? null : addDays(invoiceDay(o), o.creditDays)
}

export type CreditOrder = {
  id: string; orderNumber: string; patientName: string; createdAt: Date; invoiceNumber: string | null
  creditDays: number; invoiceDay: string; due: string; total: number; paid: number; balance: number; daysOverdue: number
}
export type ClinicCredit = {
  clinicId: string
  line: { id: string; limit: number; termDays: number; active: boolean } | null
  used: number // saldo de todas sus órdenes a crédito
  overdue: number // saldo vencido
  nextDue: string | null // vencimiento más próximo con saldo
  inMora: boolean
  overLimit: boolean
  orders: CreditOrder[] // órdenes a crédito con saldo, la más antigua primero
}

const examSelect = { price: true, discountType: true, discountValue: true, amountPaid: true } as const

// Cartera de uno o varios clientes (todos si no se pasa la lista): líneas + órdenes a crédito con saldo
export async function getClinicCredits(clinicIds?: string[]): Promise<Map<string, ClinicCredit>> {
  const ids = clinicIds ? Array.from(new Set(clinicIds.filter(Boolean))) : undefined
  if (ids && ids.length === 0) return new Map()
  const [lines, orders] = await Promise.all([
    prisma.creditLine.findMany({ where: ids ? { clinicId: { in: ids } } : {} }),
    prisma.order.findMany({
      where: { creditDays: { not: null }, clinicId: ids ? { in: ids } : { not: null } },
      orderBy: { createdAt: "asc" },
      select: { id: true, clinicId: true, orderNumber: true, patientName: true, createdAt: true, invoiceNumber: true, invoicedAt: true, creditDays: true, exams: { select: examSelect } },
    }),
  ])
  const today = todayKey()
  const map = new Map<string, ClinicCredit>()
  const get = (clinicId: string) => {
    if (!map.has(clinicId)) map.set(clinicId, { clinicId, line: null, used: 0, overdue: 0, nextDue: null, inMora: false, overLimit: false, orders: [] })
    return map.get(clinicId)!
  }
  for (const l of lines) get(l.clinicId).line = { id: l.id, limit: l.limit, termDays: l.termDays, active: l.active }
  for (const o of orders) {
    const pay = orderPayment(o.exams)
    if (pay.balance <= 0) continue
    const c = get(o.clinicId!)
    const due = dueDateOf(o)!
    const daysOverdue = Math.max(daysBetween(due, today), 0)
    c.orders.push({
      id: o.id, orderNumber: o.orderNumber, patientName: o.patientName, createdAt: o.createdAt, invoiceNumber: o.invoiceNumber,
      creditDays: o.creditDays!, invoiceDay: invoiceDay(o), due, total: pay.total, paid: pay.paid, balance: pay.balance, daysOverdue,
    })
    c.used += pay.balance
    if (due < today) c.overdue += pay.balance
    if (!c.nextDue || due < c.nextDue) c.nextDue = due
  }
  for (const c of Array.from(map.values())) {
    c.inMora = c.overdue > 0
    c.overLimit = !!c.line && c.used > c.line.limit
  }
  return map
}

export async function getClinicCredit(clinicId: string): Promise<ClinicCredit> {
  return (await getClinicCredits([clinicId])).get(clinicId)
    ?? { clinicId, line: null, used: 0, overdue: 0, nextDue: null, inMora: false, overLimit: false, orders: [] }
}

// Clientes en mora entre estos (para liberar o retener resultados en listados)
export async function moraClinics(clinicIds: (string | null | undefined)[]): Promise<Set<string>> {
  const credits = await getClinicCredits(clinicIds.filter((x): x is string => !!x))
  return new Set(Array.from(credits.values()).filter(c => c.inMora).map(c => c.clinicId))
}

// ¿La clínica puede ver el resultado de esta orden? (rutas de PDF, fotos y enlaces de WhatsApp)
export async function orderReleased(order: {
  clinicId: string | null; creditDays: number | null; exams: PayableExam[]; clinic?: { noCharge: boolean } | null
}) {
  const base = orderPayment(order.exams, order.clinic?.noCharge)
  if (base.released || order.creditDays == null || !order.clinicId) return base.released
  return !(await moraClinics([order.clinicId])).has(order.clinicId)
}

export const netOfExam = (e: PayableExam) => computeNetPrice(e.price, e.discountType, e.discountValue)
