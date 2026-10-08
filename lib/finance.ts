import { prisma } from "./db"
import { computeNetPrice } from "./billing"
import { orderPayment } from "./payment"

// Dashboard financiero (/finanzas). Una venta se cuenta el día en que se registra la muestra (hora de
// Bogotá), por su precio neto (lista – descuento) de Caja. "Recaudado" = amountPaid de esas muestras (no
// hay fecha de pago guardada). Las clínicas sin cobro (Pets & Pets) no suman a la venta: van aparte como
// servicio interno a precio de lista. Procesados = exámenes completados en el período (por completedAt).

const TZ = "America/Bogota"
export const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ }) // YYYY-MM-DD

// Inicio del día YYYY-MM-DD en Bogotá (UTC-5, sin horario de verano)
const startOf = (key: string) => new Date(`${key}T00:00:00-05:00`)
const addDays = (key: string, n: number) => dayKey(new Date(startOf(key).getTime() + n * 86400000 + 12 * 3600000))

export type PeriodKey = "hoy" | "7d" | "30d" | "mes" | "mes-anterior" | "90d" | "ano" | "custom"
export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "hoy", label: "Hoy" },
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "mes", label: "Este mes" },
  { key: "mes-anterior", label: "Mes anterior" },
  { key: "90d", label: "90 días" },
  { key: "ano", label: "Este año" },
]

export function resolvePeriod(key: string | undefined, desde?: string, hasta?: string) {
  const today = dayKey(new Date())
  const valid = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
  let from: string, to: string, k: PeriodKey = (key as PeriodKey) ?? "30d"
  if (valid(desde) && valid(hasta) && desde! <= hasta!) { k = "custom"; from = desde!; to = hasta! }
  else if (k === "hoy") { from = to = today }
  else if (k === "7d") { from = addDays(today, -6); to = today }
  else if (k === "mes") { from = `${today.slice(0, 8)}01`; to = today }
  else if (k === "mes-anterior") {
    const firstThis = `${today.slice(0, 8)}01`
    to = addDays(firstThis, -1); from = `${to.slice(0, 8)}01`
  }
  else if (k === "90d") { from = addDays(today, -89); to = today }
  else if (k === "ano") { from = `${today.slice(0, 4)}-01-01`; to = today }
  else { k = "30d"; from = addDays(today, -29); to = today }

  const days: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d)
  // Período anterior de la misma duración, para comparar
  const prevTo = addDays(from, -1), prevFrom = addDays(prevTo, -(days.length - 1))
  return { key: k, from, to, days, prevFrom, prevTo, start: startOf(from), end: startOf(addDays(to, 1)), prevStart: startOf(prevFrom) }
}

type Totals = {
  gross: number; discounts: number; net: number; collected: number; receivable: number
  samples: number; exams: number; processed: number; avgTicket: number; avgTurnaroundH: number | null
}

export async function getFinance(period: ReturnType<typeof resolvePeriod>) {
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: period.prevStart, lt: period.end } },
    select: {
      id: true, createdAt: true, source: true, clinicId: true,
      clinic: { select: { name: true, noCharge: true } },
      exams: {
        select: {
          price: true, discountType: true, discountValue: true, amountPaid: true, paymentMethod: true, status: true,
          template: { select: { name: true, area: true, isCustom: true } },
        },
      },
    },
  })
  const completed = await prisma.orderExam.findMany({
    where: { completedAt: { gte: period.prevStart, lt: period.end } },
    select: { completedAt: true, order: { select: { createdAt: true } } },
  })

  const inCur = (d: Date) => d >= period.start && d < period.end
  const inPrev = (d: Date) => d >= period.prevStart && d < period.start
  const billable = orders.filter(o => !o.clinic?.noCharge)

  function totals(pick: (d: Date) => boolean): Totals {
    const os = billable.filter(o => pick(o.createdAt))
    let gross = 0, net = 0, collected = 0, exams = 0
    for (const o of os) for (const e of o.exams) {
      gross += e.price
      net += computeNetPrice(e.price, e.discountType, e.discountValue)
      collected += Math.min(e.amountPaid, computeNetPrice(e.price, e.discountType, e.discountValue))
      exams++
    }
    const done = completed.filter(c => c.completedAt && pick(c.completedAt))
    const hours = done.map(c => (c.completedAt!.getTime() - c.order.createdAt.getTime()) / 3600000).filter(h => h >= 0)
    return {
      gross, discounts: gross - net, net, collected, receivable: Math.max(net - collected, 0),
      samples: os.length, exams, processed: done.length,
      avgTicket: os.length ? net / os.length : 0,
      avgTurnaroundH: hours.length ? hours.reduce((a, b) => a + b, 0) / hours.length : null,
    }
  }
  const cur = totals(inCur), prev = totals(inPrev)
  const curOrders = billable.filter(o => inCur(o.createdAt))

  // Serie diaria
  const daily = period.days.map(day => ({ day, net: 0, collected: 0, samples: 0, processed: 0 }))
  const byDay = new Map(daily.map(d => [d.day, d]))
  // Volumen de muestras: todas (incluye Pets & Pets); ventas: solo las que se cobran
  for (const o of orders) if (inCur(o.createdAt)) { const d = byDay.get(dayKey(o.createdAt)); if (d) d.samples++ }
  for (const o of curOrders) {
    const d = byDay.get(dayKey(o.createdAt)); if (!d) continue
    for (const e of o.exams) {
      const n = computeNetPrice(e.price, e.discountType, e.discountValue)
      d.net += n; d.collected += Math.min(e.amountPaid, n)
    }
  }
  for (const c of completed) if (c.completedAt && inCur(c.completedAt)) { const d = byDay.get(dayKey(c.completedAt)); if (d) d.processed++ }

  // Por categoría (área) y por examen
  const areas = new Map<string, { area: string; exams: number; net: number }>()
  const examsMap = new Map<string, { name: string; area: string; count: number; net: number; custom: boolean }>()
  for (const o of curOrders) for (const e of o.exams) {
    const n = computeNetPrice(e.price, e.discountType, e.discountValue)
    const a = areas.get(e.template.area) ?? { area: e.template.area, exams: 0, net: 0 }
    a.exams++; a.net += n; areas.set(e.template.area, a)
    const x = examsMap.get(e.template.name) ?? { name: e.template.name, area: e.template.area, count: 0, net: 0, custom: e.template.isCustom }
    x.count++; x.net += n; examsMap.set(e.template.name, x)
  }

  // Por clínica
  const clinics = new Map<string, { name: string; samples: number; net: number; collected: number }>()
  for (const o of curOrders) {
    const key = o.clinicId ?? "-"
    const c = clinics.get(key) ?? { name: o.clinic?.name ?? "Particular / sin clínica", samples: 0, net: 0, collected: 0 }
    c.samples++
    for (const e of o.exams) { const n = computeNetPrice(e.price, e.discountType, e.discountValue); c.net += n; c.collected += Math.min(e.amountPaid, n) }
    clinics.set(key, c)
  }

  // Medio de pago (sobre lo recaudado en el período) y lo que falta
  let cash = 0, transfer = 0
  for (const o of curOrders) for (const e of o.exams) {
    const paid = Math.min(e.amountPaid, computeNetPrice(e.price, e.discountType, e.discountValue))
    if (e.paymentMethod === "TRANSFERENCIA") transfer += paid; else cash += paid
  }

  // Origen de las muestras y servicio interno sin cobro
  const portal = curOrders.filter(o => o.source === "PORTAL").length
  const internal = orders.filter(o => o.clinic?.noCharge && inCur(o.createdAt))
  const internalValue = internal.reduce((n, o) => n + o.exams.reduce((m, e) => m + e.price, 0), 0)

  // Cartera total (todas las fechas) y resultados retenidos por pago hoy
  const all = await prisma.order.findMany({
    where: { OR: [{ clinicId: null }, { clinic: { noCharge: false } }] },
    select: {
      id: true, orderNumber: true, patientName: true, createdAt: true, clinic: { select: { name: true, noCharge: true } },
      exams: { select: { price: true, discountType: true, discountValue: true, amountPaid: true, status: true } },
    },
  })
  let portfolio = 0
  const debtors = new Map<string, { name: string; balance: number; orders: number }>()
  const held: { id: string; orderNumber: string; patientName: string; clinic: string; balance: number }[] = []
  for (const o of all) {
    const pay = orderPayment(o.exams, o.clinic?.noCharge)
    if (pay.balance > 0) {
      portfolio += pay.balance
      const k = o.clinic?.name ?? "Particular / sin clínica"
      const d = debtors.get(k) ?? { name: k, balance: 0, orders: 0 }
      d.balance += pay.balance; d.orders++; debtors.set(k, d)
    }
    if (!pay.released && o.exams.some(e => e.status === "COMPLETADO")) {
      held.push({ id: o.id, orderNumber: o.orderNumber, patientName: o.patientName, clinic: o.clinic?.name ?? "—", balance: pay.balance })
    }
  }

  return {
    cur, prev, daily,
    areas: Array.from(areas.values()).sort((a, b) => b.net - a.net),
    exams: Array.from(examsMap.values()).sort((a, b) => b.net - a.net || b.count - a.count),
    clinics: Array.from(clinics.values()).sort((a, b) => b.net - a.net),
    payment: { cash, transfer, pending: Math.max(cur.net - cash - transfer, 0) },
    origin: { portal, lab: curOrders.length - portal },
    internal: { samples: internal.length, value: internalValue },
    portfolio, debtors: Array.from(debtors.values()).sort((a, b) => b.balance - a.balance),
    held: held.sort((a, b) => b.balance - a.balance),
  }
}
