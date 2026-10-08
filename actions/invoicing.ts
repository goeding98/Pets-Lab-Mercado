"use server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"

async function requireBilling() {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "facturacion")) throw new Error("No autorizado")
  return session
}

// Marca órdenes como facturadas con el número de factura (una factura puede cubrir varias órdenes)
export async function markInvoiced(orderIds: string[], invoiceNumber: string): Promise<{ error?: string }> {
  const session = await requireBilling()
  const num = invoiceNumber.trim().slice(0, 60)
  if (!num) return { error: "Escribe el número de la factura." }
  if (orderIds.length === 0) return { error: "Selecciona al menos una orden." }
  await prisma.order.updateMany({
    where: { id: { in: orderIds }, OR: [{ clinicId: null }, { clinic: { noCharge: false } }] },
    data: { invoiceNumber: num, invoicedAt: new Date(), invoicedByName: session.user.name ?? "—" },
  })
  revalidatePath("/facturacion")
  return {}
}

// Deshacer (ej. número equivocado): la orden vuelve a "por facturar"
export async function unmarkInvoiced(orderId: string): Promise<{ error?: string }> {
  await requireBilling()
  await prisma.order.update({ where: { id: orderId }, data: { invoiceNumber: null, invoicedAt: null, invoicedByName: null } })
  revalidatePath("/facturacion")
  return {}
}
