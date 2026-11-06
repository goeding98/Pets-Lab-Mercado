"use server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"

async function requireStaff() {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "caja")) throw new Error("No autorizado")
  return session
}

type BillingFields = Partial<{
  price: number
  discountType: string
  discountValue: number
  paymentTerm: string
  paymentMethod: string
  amountPaid: number
}>

export async function updateBilling(orderExamId: string, fields: BillingFields): Promise<{ error?: string }> {
  await requireStaff()

  // Crédito solo si el cliente tiene línea activa (/credito); la orden queda a crédito (Order.creditDays) mientras
  // alguno de sus exámenes lo esté
  if (fields.paymentTerm !== undefined && fields.paymentTerm !== "CREDITO" && fields.paymentTerm !== "CONTADO") throw new Error("Plazo inválido")
  const current = await prisma.orderExam.findUnique({ where: { id: orderExamId }, select: { order: { select: { id: true, clinicId: true, creditDays: true } } } })
  if (!current) throw new Error("Examen no encontrado")
  const line = fields.paymentTerm === "CREDITO" && current.order.clinicId
    ? await prisma.creditLine.findUnique({ where: { clinicId: current.order.clinicId } })
    : null
  if (fields.paymentTerm === "CREDITO" && !line?.active) return { error: "Este cliente no tiene línea de crédito activa (se abre en Líneas de crédito)." }

  const exam = await prisma.orderExam.update({
    where: { id: orderExamId },
    data: fields,
    select: { orderId: true },
  })
  if (fields.paymentTerm === "CREDITO" && current.order.creditDays == null) {
    await prisma.order.update({ where: { id: exam.orderId }, data: { creditDays: line!.termDays } })
  } else if (fields.paymentTerm === "CONTADO" && current.order.creditDays != null) {
    const still = await prisma.orderExam.count({ where: { orderId: exam.orderId, paymentTerm: "CREDITO" } })
    if (still === 0) await prisma.order.update({ where: { id: exam.orderId }, data: { creditDays: null } })
  }

  revalidatePath("/caja")
  revalidatePath("/cartera", "layout")
  revalidatePath("/muestras")
  revalidatePath(`/muestras/${exam.orderId}`)
  return {}
}
