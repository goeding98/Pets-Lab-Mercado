"use server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"
import { consumeInventoryForExam } from "@/lib/inventory"
import { phError, readCopro, readCoproscopico } from "@/lib/coprologico"
import { createWithOrderNumber, examsWithListPrice, resolveBranch } from "@/lib/orders"

export async function createOrder(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "muestras.crear")) throw new Error("No autorizado")

  const templateIds = formData.getAll("templateIds") as string[]
  if (templateIds.length === 0) throw new Error("Selecciona al menos un examen")

  const validCount = await prisma.examTemplate.count({ where: { id: { in: templateIds }, active: true } })
  if (validCount !== templateIds.length) throw new Error("Examen no válido")

  const clinicIdRaw = formData.get("clinicId") as string
  const clinicId = clinicIdRaw && clinicIdRaw !== "" ? clinicIdRaw : null
  const branchId = await resolveBranch(clinicId, formData.get("branchId"))
  const exams = await examsWithListPrice(templateIds)

  const order = await createWithOrderNumber(orderNumber => prisma.order.create({
    data: {
      orderNumber,
      patientName: formData.get("patientName") as string,
      species: formData.get("species") as string,
      breed: (formData.get("breed") as string) || null,
      age: (formData.get("age") as string) || null,
      sex: (formData.get("sex") as string) || null,
      ownerName: (formData.get("ownerName") as string) || null,
      requestingVet: (formData.get("requestingVet") as string) || null,
      clinicId,
      branchId,
      processedById: session.user.id,
      notes: (formData.get("notes") as string) || null,
      exams: {
        create: exams,
      },
    },
  }))

  revalidatePath("/muestras")
  redirect(`/muestras/${order.id}`)
}

export async function updateOrderStatus(orderId: string, status: string) {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "resultados.editar")) throw new Error("No autorizado")

  await prisma.order.update({ where: { id: orderId }, data: { status } })
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
  structured?: { copro?: unknown; coproscopico?: unknown },
) {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "resultados.editar")) throw new Error("No autorizado")

  // Bloques con formulario propio: se normalizan (y se acotan) antes de guardar
  const structuredData = structured?.copro !== undefined
    ? { copro: readCopro(structured), ...(structured.coproscopico !== undefined ? { coproscopico: readCoproscopico(structured) } : {}) }
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
      data: { status: "COMPLETADO", completedAt: new Date(), ...(structuredData ? { structured: structuredData } : {}) },
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
