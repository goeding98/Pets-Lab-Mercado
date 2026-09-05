"use server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { consumeInventoryForExam } from "@/lib/inventory"

async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.order.count({
    where: { createdAt: { gte: new Date(year, 0, 1) } },
  })
  return `${year}-${String(count + 1).padStart(5, "0")}`
}

export async function createOrder(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === "CLINIC") throw new Error("No autorizado")

  const templateIds = formData.getAll("templateIds") as string[]
  if (templateIds.length === 0) throw new Error("Selecciona al menos un examen")

  const clinicIdRaw = formData.get("clinicId") as string
  const clinicId = clinicIdRaw && clinicIdRaw !== "" ? clinicIdRaw : null

  const order = await prisma.order.create({
    data: {
      orderNumber: await generateOrderNumber(),
      patientName: formData.get("patientName") as string,
      species: formData.get("species") as string,
      breed: (formData.get("breed") as string) || null,
      age: (formData.get("age") as string) || null,
      sex: (formData.get("sex") as string) || null,
      ownerName: (formData.get("ownerName") as string) || null,
      requestingVet: (formData.get("requestingVet") as string) || null,
      clinicId,
      processedById: session.user.id,
      notes: (formData.get("notes") as string) || null,
      exams: {
        create: templateIds.map(id => ({ templateId: id })),
      },
    },
  })

  revalidatePath("/muestras")
  redirect(`/muestras/${order.id}`)
}

export async function updateOrderStatus(orderId: string, status: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === "CLINIC") throw new Error("No autorizado")

  await prisma.order.update({ where: { id: orderId }, data: { status } })
  revalidatePath(`/muestras/${orderId}`)
  revalidatePath("/muestras")
  revalidatePath("/dashboard")
}

export async function saveExamResults(
  orderExamId: string,
  results: { fieldId: string; value: string; flagged: boolean }[]
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === "CLINIC") throw new Error("No autorizado")

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
      data: { status: "COMPLETADO", completedAt: new Date() },
    })

    // Descontar del inventario los insumos de la receta, solo la primera vez que se completa
    if (!wasComplete) {
      await consumeInventoryForExam(tx, orderExamId, current.templateId)
    }
  })

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
