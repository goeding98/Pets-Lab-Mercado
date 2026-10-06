"use server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { del } from "@vercel/blob"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"
import { assertOrderableTemplates } from "@/lib/catalog"

// Corregir los exámenes de una muestra (ej. la clínica pidió un perfil y quería otro). Solo el
// personal, y solo exámenes pendientes: uno completado tiene resultados e inventario descontado.
// El precio pasa a ser el de lista del examen nuevo (descuento en 0); lo ya pagado se conserva y el
// módulo de pago muestra el saldo. Cada cambio queda anotado en las observaciones de la orden.

async function requireStaff() {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "muestras.crear")) throw new Error("No autorizado")
  return session
}

async function pendingExam(orderExamId: string) {
  const exam = await prisma.orderExam.findUnique({
    where: { id: orderExamId },
    include: { template: { select: { name: true } }, order: { select: { id: true, clinicId: true, notes: true } } },
  })
  if (!exam) throw new Error("Examen no encontrado")
  if (exam.status !== "PENDIENTE" || exam.uploadedPdfPath) {
    throw new Error("Solo se pueden cambiar exámenes pendientes (este ya tiene resultado).")
  }
  return exam
}

const today = () => new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota" })
const withLog = (notes: string | null, line: string) => (notes ? `${notes}\n${line}` : line)

async function listPrice(templateId: string) {
  const t = await prisma.examTemplate.findUniqueOrThrow({ where: { id: templateId }, select: { name: true, price: true } })
  return { name: t.name, price: t.price ?? 0 }
}

// La orden queda completa solo si todos sus exámenes lo están
async function syncOrderStatus(orderId: string) {
  const exams = await prisma.orderExam.findMany({ where: { orderId }, select: { status: true } })
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { status: true } })
  const allDone = exams.length > 0 && exams.every(e => e.status === "COMPLETADO")
  if (allDone && order.status !== "COMPLETADA") await prisma.order.update({ where: { id: orderId }, data: { status: "COMPLETADA" } })
  if (!allDone && order.status === "COMPLETADA") await prisma.order.update({ where: { id: orderId }, data: { status: "EN_PROCESO" } })
}

function revalidate(orderId: string) {
  revalidatePath(`/muestras/${orderId}`)
  revalidatePath("/muestras")
  revalidatePath("/caja")
  revalidatePath("/portal-vet/dashboard")
}

export async function changeOrderExam(orderExamId: string, templateId: string): Promise<{ error?: string }> {
  const session = await requireStaff()
  try {
    const exam = await pendingExam(orderExamId)
    if (exam.templateId === templateId) return {}
    await assertOrderableTemplates([templateId], exam.order.clinicId)
    const next = await listPrice(templateId)
    await prisma.$transaction([
      // Se cambia en el mismo registro: conserva comentarios y fotos de la muestra
      prisma.orderExam.update({
        where: { id: orderExamId },
        data: { templateId, price: next.price, discountType: "VALOR", discountValue: 0 },
      }),
      prisma.order.update({
        where: { id: exam.order.id },
        data: { notes: withLog(exam.order.notes, `[${today()}] Examen cambiado: ${exam.template.name} → ${next.name} (por ${session.user.name})`) },
      }),
    ])
    revalidate(exam.order.id)
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function addOrderExam(orderId: string, templateId: string): Promise<{ error?: string }> {
  const session = await requireStaff()
  try {
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, select: { clinicId: true, notes: true } })
    await assertOrderableTemplates([templateId], order.clinicId)
    const next = await listPrice(templateId)
    await prisma.$transaction([
      prisma.orderExam.create({ data: { orderId, templateId, price: next.price } }),
      prisma.order.update({
        where: { id: orderId },
        data: { notes: withLog(order.notes, `[${today()}] Examen agregado: ${next.name} (por ${session.user.name})`) },
      }),
    ])
    await syncOrderStatus(orderId)
    revalidate(orderId)
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}

export async function removeOrderExam(orderExamId: string): Promise<{ error?: string }> {
  const session = await requireStaff()
  try {
    const exam = await pendingExam(orderExamId)
    const count = await prisma.orderExam.count({ where: { orderId: exam.order.id } })
    if (count <= 1) return { error: "La orden debe tener al menos un examen: cámbialo en vez de quitarlo." }
    const photos = await prisma.examPhoto.findMany({ where: { orderExamId }, select: { url: true } })
    await prisma.$transaction([
      prisma.orderExam.delete({ where: { id: orderExamId } }),
      prisma.order.update({
        where: { id: exam.order.id },
        data: { notes: withLog(exam.order.notes, `[${today()}] Examen quitado: ${exam.template.name} (por ${session.user.name})`) },
      }),
    ])
    await Promise.all(photos.map(p => del(p.url).catch(() => {})))
    await syncOrderStatus(exam.order.id)
    revalidate(exam.order.id)
    return {}
  } catch (e) {
    return { error: (e as Error).message }
  }
}
