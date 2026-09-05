"use server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

async function requireStaff() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === "CLINIC") throw new Error("No autorizado")
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

export async function updateBilling(orderExamId: string, fields: BillingFields) {
  await requireStaff()

  const exam = await prisma.orderExam.update({
    where: { id: orderExamId },
    data: fields,
    select: { orderId: true },
  })

  revalidatePath("/caja")
  revalidatePath("/muestras")
  revalidatePath(`/muestras/${exam.orderId}`)
}
