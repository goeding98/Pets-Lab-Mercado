"use server"
import { prisma } from "@/lib/db"

export async function lookupOrder(orderNumber: string) {
  const order = await prisma.order.findUnique({
    where: { orderNumber: orderNumber.trim().toUpperCase() },
    include: {
      exams: { include: { template: true } },
    },
  })

  if (!order) return { error: "No encontramos una orden con ese número. Verifica e intenta de nuevo." }

  return {
    orderNumber: order.orderNumber,
    patientName: order.patientName,
    species: order.species,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    orderId: order.id,
    canDownload: order.status === "COMPLETADA",
    exams: order.exams.map(e => ({ name: e.template.name, status: e.status })),
  }
}
