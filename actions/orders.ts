"use server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"
import { consumeInventoryForExam } from "@/lib/inventory"
import { normalizeCopro, phError, readCopro, readCoproscopico } from "@/lib/coprologico"
import { orinaErrors, readOrina } from "@/lib/orina"

// Parcial de Orina: el reactivo se toma del inventario (lote y vencimiento actuales, no los del
// navegador) y no se puede validar con un lote vencido ni con datos fuera de rango.
async function validatedOrina(structured: unknown) {
  const orina = readOrina(structured)
  if (orina.reactivo) {
    const item = await prisma.inventoryItem.findUnique({ where: { id: orina.reactivo.id } })
    orina.reactivo = item?.lot && item.expiresAt
      ? { id: item.id, nombre: item.name, marca: item.brand ?? "", lote: item.lot, vence: item.expiresAt.toISOString().slice(0, 10) }
      : null
  }
  const errors = orinaErrors(orina)
  if (errors.length) throw new Error(errors.join(". "))
  return orina
}
import { createLabOrder } from "@/lib/createLabOrder"
import { markPickedUp } from "@/lib/pickups"

export async function createOrder(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "muestras.crear")) throw new Error("No autorizado")

  const order = await createLabOrder(session, formData)

  revalidatePath("/muestras")
  redirect(`/muestras/${order.id}`)
}

export async function updateOrderStatus(orderId: string, status: string) {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "resultados.editar")) throw new Error("No autorizado")

  const order = await prisma.order.update({ where: { id: orderId }, data: { status }, select: { pickup: { select: { id: true, status: true } } } })
  // Recibir la muestra de una recogida que nadie marcó como "Recogida" cuenta como recogida en este momento
  // (lib/pickups.ts: si ya pasó la garantía, aplica el 50 %)
  if (status === "RECIBIDA" && order.pickup?.status === "PENDIENTE") await markPickedUp(order.pickup.id, session.user.name ?? "Laboratorio")
  revalidatePath(`/muestras/${orderId}`)
  revalidatePath("/muestras")
  revalidatePath("/dashboard")
}

// Comentarios del encargado sobre un examen. Se pueden editar aunque el examen ya esté completado.
export async function saveExamComments(orderExamId: string, comments: string) {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "resultados.editar")) throw new Error("No autorizado")

  const exam = await prisma.orderExam.update({
    where: { id: orderExamId },
    data: { comments: comments.trim() || null },
    select: { orderId: true },
  })
  revalidatePath(`/muestras/${exam.orderId}`)
}

export async function saveExamResults(
  orderExamId: string,
  results: { fieldId: string; value: string; flagged: boolean }[],
  structured?: { copro?: unknown; coproSerie?: unknown; coproscopico?: unknown; orina?: unknown },
) {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "resultados.editar")) throw new Error("No autorizado")

  // Bloques con formulario propio: se normalizan (y se acotan) antes de guardar
  const structuredData = structured && Object.keys(structured).length
    ? {
        ...(structured.copro !== undefined ? { copro: readCopro(structured) } : {}),
        ...(Array.isArray(structured.coproSerie) ? { coproSerie: structured.coproSerie.slice(0, 10).map(normalizeCopro) } : {}),
        ...(structured.coproscopico !== undefined ? { coproscopico: readCoproscopico(structured) } : {}),
        ...(structured.orina !== undefined ? { orina: await validatedOrina(structured) } : {}),
      }
    : undefined
  if (structuredData?.coproscopico) {
    const phInvalid = phError(structuredData.coproscopico.ph)
    if (phInvalid) throw new Error(phInvalid)
  }

  const current = await prisma.orderExam.findUnique({
    where: { id: orderExamId },
    select: { status: true, templateId: true, orderId: true },
  })
  if (!current) throw new Error("Examen no encontrado")
  const wasComplete = current.status === "COMPLETADO"

  await prisma.$transaction(async tx => {
    await tx.examResult.deleteMany({ where: { orderExamId } })
    await tx.examResult.createMany({
      data: results.map(r => ({
        orderExamId,
        fieldId: r.fieldId,
        value: r.value,
        flagged: r.flagged,
      })),
    })

    // Mark exam as completed
    await tx.orderExam.update({
      where: { id: orderExamId },
      // Si se está editando un resultado ya completado, se conserva la fecha en que se completó
      data: { status: "COMPLETADO", ...(wasComplete ? {} : { completedAt: new Date() }), ...(structuredData ? { structured: structuredData } : {}) },
    })

    // Descontar del inventario los insumos de la receta, solo la primera vez que se completa
    if (!wasComplete) {
      await consumeInventoryForExam(tx, orderExamId, current.templateId)
    }
  }, { maxWait: 10000, timeout: 20000 }) // el default (5 s) es justo con la latencia Vercel → Supabase sa-east-1

  // Check if all exams are complete → update order status
  const allExams = await prisma.orderExam.findMany({
    where: { orderId: current.orderId },
    select: { status: true },
  })
  const allDone = allExams.every(e => e.status === "COMPLETADO")
  await prisma.order.update({
    where: { id: current.orderId },
    data: { status: allDone ? "COMPLETADA" : "EN_PROCESO" },
  })
  revalidatePath(`/muestras/${current.orderId}`)
  revalidatePath("/muestras")
  revalidatePath("/dashboard")
  revalidatePath("/inventario")
}

// Borrador: guarda lo digitado de un examen pendiente sin completarlo (no descuenta inventario, no sale
// al cliente ni en el reporte de la orden). Sin validaciones de cierre (orina, pH): se validan al guardar
// el resultado final. Al abrir el examen se ve lo guardado.
export async function saveExamDraft(
  orderExamId: string,
  results: { fieldId: string; value: string; flagged: boolean }[],
  structured?: { copro?: unknown; coproSerie?: unknown; coproscopico?: unknown; orina?: unknown },
): Promise<{ error?: string; savedAt?: string }> {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "resultados.editar")) return { error: "No autorizado" }

  const current = await prisma.orderExam.findUnique({ where: { id: orderExamId }, select: { status: true, orderId: true } })
  if (!current) return { error: "Examen no encontrado" }
  if (current.status === "COMPLETADO") return { error: "El examen ya está completado: usa Guardar cambios." }

  const structuredData = structured && Object.keys(structured).length
    ? {
        ...(structured.copro !== undefined ? { copro: readCopro(structured) } : {}),
        ...(Array.isArray(structured.coproSerie) ? { coproSerie: structured.coproSerie.slice(0, 10).map(normalizeCopro) } : {}),
        ...(structured.coproscopico !== undefined ? { coproscopico: readCoproscopico(structured) } : {}),
        ...(structured.orina !== undefined ? { orina: readOrina(structured) } : {}),
      }
    : undefined

  await prisma.$transaction(async tx => {
    await tx.examResult.deleteMany({ where: { orderExamId } })
    const filled = results.filter(r => r.value !== "")
    if (filled.length) await tx.examResult.createMany({ data: filled.map(r => ({ orderExamId, ...r })) })
    if (structuredData) await tx.orderExam.update({ where: { id: orderExamId }, data: { structured: structuredData } })
    // Empezar a trabajar una muestra recibida la pasa a "en proceso"
    await tx.order.updateMany({ where: { id: current.orderId, status: "RECIBIDA" }, data: { status: "EN_PROCESO" } })
  }, { maxWait: 10000, timeout: 20000 })

  revalidatePath(`/muestras/${current.orderId}`)
  revalidatePath("/muestras")
  return { savedAt: new Date().toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit" }) }
}
