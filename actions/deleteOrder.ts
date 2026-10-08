"use server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { del } from "@vercel/blob"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"
import { computeNetPrice } from "@/lib/billing"

// Eliminar una muestra (solo ADMIN, motivo obligatorio). Antes de borrar se guarda en DeletedOrder quién,
// cuándo, por qué y una copia completa (datos, exámenes, resultados, cobro). Se borran también sus PDFs y
// fotos del Blob. El inventario ya descontado no se devuelve: si se procesó, los insumos se gastaron.
export async function deleteOrder(orderId: string, reason: string): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "muestras.eliminar")) return { error: "No autorizado" }

  const why = reason.trim()
  if (why.length < 10) return { error: "Explica el motivo (mínimo 10 caracteres)." }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      clinic: { select: { name: true } },
      branch: { select: { name: true } },
      exams: {
        include: {
          template: { select: { name: true } },
          results: { include: { field: { select: { name: true } } } },
          photos: { select: { url: true, name: true, role: true } },
        },
      },
    },
  })
  if (!order) return { error: "La muestra ya no existe." }

  const total = order.exams.reduce((n, e) => n + computeNetPrice(e.price, e.discountType, e.discountValue), 0)
  const paid = order.exams.reduce((n, e) => n + e.amountPaid, 0)
  const snapshot = JSON.parse(JSON.stringify({
    ...order,
    exams: order.exams.map(e => ({
      ...e,
      results: e.results.map(r => ({ parametro: r.field.name, valor: r.value, fueraDeRango: r.flagged })),
    })),
  }))

  await prisma.$transaction([
    prisma.deletedOrder.create({
      data: {
        orderNumber: order.orderNumber,
        patientName: order.patientName,
        species: order.species,
        ownerName: order.ownerName,
        clinicName: order.clinic?.name ?? null,
        branchName: order.branch?.name ?? null,
        exams: order.exams.map(e => e.template.name).join(", "),
        total,
        paid,
        status: order.status,
        orderedAt: order.createdAt,
        reason: why.slice(0, 2000),
        deletedById: session.user.id,
        deletedByName: session.user.name ?? "—",
        snapshot,
      },
    }),
    // Exámenes, resultados y fotos se borran en cascada
    prisma.order.delete({ where: { id: orderId } }),
  ])

  // Archivos privados en Blob (PDF subidos y fotos): ya no los referencia nada
  const urls = order.exams.flatMap(e => [...(e.uploadedPdfPath?.startsWith("http") ? [e.uploadedPdfPath] : []), ...e.photos.map(p => p.url)])
  await Promise.all(urls.map(u => del(u).catch(() => {})))

  revalidatePath("/muestras")
  revalidatePath("/muestras/eliminadas")
  revalidatePath("/pacientes")
  revalidatePath("/caja")
  revalidatePath("/dashboard")
  revalidatePath("/portal-vet/dashboard")
  return {}
}
