"use server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import type { Prisma } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can, canManageCredit, canSeeCartera } from "@/lib/permissions"
import { CREDIT_LIMITS, CREDIT_TERMS, getClinicCredit, netOfExam, todayKey } from "@/lib/credit"
import { PAYMENT_METHODS, formatCOP } from "@/lib/payment"

function revalidateCredit(orderIds: string[] = []) {
  revalidatePath("/credito")
  revalidatePath("/cartera", "layout")
  revalidatePath("/caja")
  revalidatePath("/muestras")
  revalidatePath("/portal-vet/dashboard")
  for (const id of orderIds) revalidatePath(`/muestras/${id}`)
}

async function stamp(orderId: string, text: string, by: string) {
  const o = await prisma.order.findUnique({ where: { id: orderId }, select: { notes: true } })
  const line = `[${todayKey()} · ${by}] ${text}`
  await prisma.order.update({ where: { id: orderId }, data: { notes: o?.notes ? `${o.notes}\n${line}` : line } })
}

// ── Líneas de crédito (/credito) ─────────────────────────────────────────────────────────────────────
async function saveCreditLineCore(clinicId: string, limit: number, termDays: number) {
  const session = await getServerSession(authOptions)
  if (!canManageCredit(session?.user.role, session?.user.email)) throw new Error("No autorizado")
  if (!CREDIT_LIMITS.includes(limit)) throw new Error("El cupo debe ser de 1 a 10 millones, en saltos de 1 millón.")
  if (!(CREDIT_TERMS as readonly number[]).includes(termDays)) throw new Error("El plazo debe ser de 15 o 30 días.")
  const clinic = await prisma.clinic.findUnique({ where: { id: clinicId }, select: { noCharge: true } })
  if (!clinic) throw new Error("Cliente no encontrado.")
  if (clinic.noCharge) throw new Error("Pets & Pets es cliente sin cobro: no necesita línea de crédito.")
  const by = session!.user.name ?? session!.user.email ?? "—"
  await prisma.creditLine.upsert({
    where: { clinicId },
    create: { clinicId, limit, termDays, createdByName: by, updatedByName: by },
    update: { limit, termDays, active: true, updatedByName: by },
  })
  revalidateCredit()
}

async function setCreditLineActiveCore(lineId: string, active: boolean) {
  const session = await getServerSession(authOptions)
  if (!canManageCredit(session?.user.role, session?.user.email)) throw new Error("No autorizado")
  await prisma.creditLine.update({ where: { id: lineId }, data: { active, updatedByName: session!.user.name ?? "—" } })
  revalidateCredit()
}

// ── Orden a crédito (método de pago "Crédito") ──────────────────────────────────────────────────────
// Copia el plazo de la línea del cliente. Devuelve un aviso si con esta orden se pasa del cupo (se deja pasar).
async function setOrderCreditCore(orderId: string, on: boolean): Promise<{ warning?: string }> {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "pagos")) throw new Error("No autorizado")
  const by = session.user.name ?? "—"
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { clinicId: true, creditDays: true } })
  if (!order) throw new Error("Orden no encontrada.")

  if (!on) {
    await prisma.$transaction([
      prisma.order.update({ where: { id: orderId }, data: { creditDays: null } }),
      prisma.orderExam.updateMany({ where: { orderId }, data: { paymentTerm: "CONTADO" } }),
    ])
    await stamp(orderId, "Pago: se quitó el crédito (queda de contado).", by)
    revalidateCredit([orderId])
    return {}
  }

  const line = order.clinicId ? await prisma.creditLine.findUnique({ where: { clinicId: order.clinicId } }) : null
  if (!line?.active) throw new Error("Este cliente no tiene una línea de crédito activa.")
  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { creditDays: line.termDays } }),
    prisma.orderExam.updateMany({ where: { orderId }, data: { paymentTerm: "CREDITO" } }),
  ])
  await stamp(orderId, `Pago: a crédito, ${line.termDays} días.`, by)
  revalidateCredit([orderId])
  const credit = await getClinicCredit(order.clinicId!)
  return credit.used > line.limit
    ? { warning: `Con esta orden el cliente debe ${formatCOP(credit.used)} y su cupo es ${formatCOP(line.limit)}: queda sobre cupo.` }
    : {}
}

// ── Abonos (/cartera) ───────────────────────────────────────────────────────────────────────────────
type Allocation = { examId: string; orderId: string; amount: number }

// Reparte el abono en las órdenes a crédito con saldo, de la más antigua a la más nueva
async function registerCreditPaymentCore(clinicId: string, amount: number, date: string, method: string, note: string) {
  const session = await getServerSession(authOptions)
  if (!canSeeCartera(session?.user.role, session?.user.email)) throw new Error("No autorizado")
  amount = Math.round(amount)
  if (!(amount > 0)) throw new Error("Escribe el valor del abono.")
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayKey()) throw new Error("Revisa la fecha del pago.")
  if (!PAYMENT_METHODS.some(m => m.value === method)) throw new Error("Selecciona el medio de pago.")

  const credit = await getClinicCredit(clinicId)
  if (amount > credit.used) throw new Error(`El abono (${formatCOP(amount)}) es mayor que la deuda a crédito (${formatCOP(credit.used)}).`)

  const exams = await prisma.orderExam.findMany({
    where: { orderId: { in: credit.orders.map(o => o.id) } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, orderId: true, price: true, discountType: true, discountValue: true, amountPaid: true },
  })
  const rank = new Map(credit.orders.map((o, i) => [o.id, i]))
  exams.sort((a, b) => rank.get(a.orderId)! - rank.get(b.orderId)!)

  let left = amount
  const allocations: Allocation[] = []
  for (const e of exams) {
    if (left <= 0) break
    const owed = Math.max(netOfExam(e) - e.amountPaid, 0)
    if (owed <= 0) continue
    const take = Math.min(owed, left)
    allocations.push({ examId: e.id, orderId: e.orderId, amount: take })
    left -= take
  }

  const by = session!.user.name ?? session!.user.email ?? "—"
  await prisma.$transaction([
    ...allocations.map(a => prisma.orderExam.update({ where: { id: a.examId }, data: { amountPaid: { increment: a.amount }, paymentMethod: method } })),
    prisma.creditPayment.create({
      data: { clinicId, amount, date, method, note: note.trim() || null, allocations: allocations as unknown as Prisma.InputJsonValue, createdByName: by },
    }),
  ])
  revalidateCredit(Array.from(new Set(allocations.map(a => a.orderId))))
}

// Anula un abono: le resta a cada examen lo que se le había aplicado
async function deleteCreditPaymentCore(paymentId: string) {
  const session = await getServerSession(authOptions)
  if (!canSeeCartera(session?.user.role, session?.user.email)) throw new Error("No autorizado")
  const p = await prisma.creditPayment.findUnique({ where: { id: paymentId } })
  if (!p) throw new Error("Abono no encontrado.")
  const allocations = (p.allocations as unknown as Allocation[]) ?? []
  const exams = await prisma.orderExam.findMany({ where: { id: { in: allocations.map(a => a.examId) } }, select: { id: true, amountPaid: true } })
  const paid = new Map(exams.map(e => [e.id, e.amountPaid]))
  await prisma.$transaction([
    ...allocations
      .filter(a => paid.has(a.examId))
      .map(a => prisma.orderExam.update({ where: { id: a.examId }, data: { amountPaid: Math.max(paid.get(a.examId)! - a.amount, 0) } })),
    prisma.creditPayment.delete({ where: { id: paymentId } }),
  ])
  revalidateCredit(Array.from(new Set(allocations.map(a => a.orderId))))
}

// Acciones públicas: devuelven { error } en vez de lanzar (en producción Next oculta el texto de los errores)
type Result = { error?: string; warning?: string }
async function safe(fn: () => Promise<unknown>): Promise<Result> {
  try {
    const r = await fn()
    return (r && typeof r === "object" ? r : {}) as Result
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo guardar." }
  }
}
export async function saveCreditLine(clinicId: string, limit: number, termDays: number) { return safe(() => saveCreditLineCore(clinicId, limit, termDays)) }
export async function setCreditLineActive(lineId: string, active: boolean) { return safe(() => setCreditLineActiveCore(lineId, active)) }
export async function setOrderCredit(orderId: string, on: boolean) { return safe(() => setOrderCreditCore(orderId, on)) }
export async function registerCreditPayment(clinicId: string, amount: number, date: string, method: string, note: string) {
  return safe(() => registerCreditPaymentCore(clinicId, amount, date, method, note))
}
export async function deleteCreditPayment(paymentId: string) { return safe(() => deleteCreditPaymentCore(paymentId)) }
