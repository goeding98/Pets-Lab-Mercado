"use server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"
import { computeNetPrice } from "@/lib/billing"
import { PAYMENT_METHODS } from "@/lib/payment"

// Casilla "Pagado" de una muestra: registra en Caja el pago completo de todos sus exámenes (o lo
// quita). Al quedar pagada, el resultado se libera solo a la clínica (ver lib/payment.ts).
export async function setOrderPaid(orderId: string, paid: boolean, method?: string) {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "pagos")) throw new Error("No autorizado")
  if (paid && !PAYMENT_METHODS.some(m => m.value === method)) throw new Error("Selecciona el medio de pago")

  const exams = await prisma.orderExam.findMany({
    where: { orderId },
    select: { id: true, price: true, discountType: true, discountValue: true },
  })
  await prisma.$transaction(
    exams.map(e =>
      prisma.orderExam.update({
        where: { id: e.id },
        data: paid
          ? { amountPaid: computeNetPrice(e.price, e.discountType, e.discountValue), paymentTerm: "CONTADO", paymentMethod: method }
          : { amountPaid: 0 },
      }),
    ),
  )

  revalidatePath(`/muestras/${orderId}`)
  revalidatePath("/muestras")
  revalidatePath("/caja")
  revalidatePath("/portal-vet/dashboard")
}
