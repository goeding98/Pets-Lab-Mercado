"use server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

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

export async function toggleExamPayment(orderExamId: string, paid: boolean) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === "CLINIC") throw new Error("No autorizado")

  const orderExam = await prisma.orderExam.update({
    where: { id: orderExamId },
    data: { paid },
    select: { orderId: true },
  })

  revalidatePath(`/muestras/${orderExam.orderId}`)
  revalidatePath("/muestras")
}

export async function saveExamResults(
  orderExamId: string,
  results: { fieldId: string; value: string; flagged: boolean }[]
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === "CLINIC") throw new Error("No autorizado")

  await prisma.examResult.deleteMany({ where: { orderExamId } })
  await prisma.examResult.createMany({
    data: results.map(r => ({
      orderExamId,
      fieldId: r.fieldId,
      value: r.value,
      flagged: r.flagged,
    })),
  })

  // Mark exam as completed
  await prisma.orderExam.update({
    where: { id: orderExamId },
    data: { status: "COMPLETADO", completedAt: new Date() },
  })

  // Check if all exams are complete → update order status
  const orderExam = await prisma.orderExam.findUnique({
    where: { id: orderExamId },
    select: { orderId: true },
  })
  if (orderExam) {
    const allExams = await prisma.orderExam.findMany({
      where: { orderId: orderExam.orderId },
      select: { status: true },
    })
    const allDone = allExams.every(e => e.status === "COMPLETADO")
    if (allDone) {
      await prisma.order.update({
        where: { id: orderExam.orderId },
        data: { status: "COMPLETADA" },
      })
    } else {
      await prisma.order.update({
        where: { id: orderExam.orderId },
        data: { status: "EN_PROCESO" },
      })
    }
    revalidatePath(`/muestras/${orderExam.orderId}`)
    revalidatePath("/muestras")
    revalidatePath("/dashboard")
  }
}
