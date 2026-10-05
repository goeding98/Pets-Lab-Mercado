import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"
import { del, head } from "@vercel/blob"
import { consumeInventoryForExam, restoreInventoryForExam } from "@/lib/inventory"

// PDF de resultado de un examen. El navegador lo sube directo a Vercel Blob (token en ./token, sin el
// límite de 4.5 MB de las funciones) y aquí solo se registra: { url, name }.
export async function POST(
  req: NextRequest,
  { params }: { params: { examId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "resultados.editar"))
    return new NextResponse("No autorizado", { status: 401 })

  const { url, name } = (await req.json().catch(() => ({}))) as { url?: unknown; name?: unknown }
  if (typeof url !== "string" || !url) return new NextResponse("Sin archivo", { status: 400 })

  // Debe ser un archivo de nuestro Blob, subido para este examen
  const blob = await head(url).catch(() => null)
  if (!blob || !blob.pathname.startsWith(`uploads/${params.examId}/`) || blob.contentType !== "application/pdf")
    return new NextResponse("Archivo no válido", { status: 400 })

  const existing = await prisma.orderExam.findUnique({ where: { id: params.examId } })
  if (!existing) {
    await del(url).catch(() => {})
    return new NextResponse("No encontrado", { status: 404 })
  }
  if (existing.uploadedPdfPath?.startsWith("http") && existing.uploadedPdfPath !== url) {
    await del(existing.uploadedPdfPath).catch(() => {})
  }

  const fileName = (typeof name === "string" && name.trim() ? name.trim() : "resultado.pdf").slice(0, 200)
  const wasComplete = existing.status === "COMPLETADO"

  await prisma.$transaction(async tx => {
    await tx.orderExam.update({
      where: { id: params.examId },
      data: {
        uploadedPdfPath: url,
        uploadedPdfName: fileName,
        status: "COMPLETADO",
        ...(wasComplete ? {} : { completedAt: new Date() }),
      },
    })

    if (!wasComplete) {
      await consumeInventoryForExam(tx, params.examId, existing.templateId)
    }
  })

  // Update parent order status
  const allExams = await prisma.orderExam.findMany({
    where: { orderId: existing.orderId },
    select: { status: true },
  })
  const allDone = allExams.every(e => e.status === "COMPLETADO")
  await prisma.order.update({
    where: { id: existing.orderId },
    data: { status: allDone ? "COMPLETADA" : "EN_PROCESO" },
  })

  return NextResponse.json({ path: url, name: fileName })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { examId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "resultados.editar"))
    return new NextResponse("No autorizado", { status: 401 })

  const exam = await prisma.orderExam.findUnique({
    where: { id: params.examId },
    include: { results: { select: { value: true } } },
  })
  if (!exam) return new NextResponse("No encontrado", { status: 404 })
  if (exam.uploadedPdfPath?.startsWith("http")) {
    await del(exam.uploadedPdfPath).catch(() => {})
  }

  // Si además tiene resultados capturados sigue completado; si el PDF era el resultado, vuelve a
  // pendiente y se devuelve el consumo de inventario.
  const captured = exam.results.some(r => r.value.trim()) || exam.structured !== null

  await prisma.$transaction(async tx => {
    await tx.orderExam.update({
      where: { id: params.examId },
      data: captured
        ? { uploadedPdfPath: null, uploadedPdfName: null }
        : { uploadedPdfPath: null, uploadedPdfName: null, status: "PENDIENTE", completedAt: null },
    })
    if (!captured && exam.status === "COMPLETADO") await restoreInventoryForExam(tx, params.examId)
  })

  // La orden ya no está completa
  if (!captured) {
    await prisma.order.updateMany({ where: { id: exam.orderId, status: "COMPLETADA" }, data: { status: "EN_PROCESO" } })
  }

  return NextResponse.json({ ok: true })
}
