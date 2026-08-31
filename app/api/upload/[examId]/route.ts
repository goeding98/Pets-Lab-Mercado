import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { put, del } from "@vercel/blob"
import { randomUUID } from "crypto"

export async function POST(
  req: NextRequest,
  { params }: { params: { examId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === "CLINIC")
    return new NextResponse("No autorizado", { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return new NextResponse("Sin archivo", { status: 400 })

  // Remove old uploaded file if exists
  const existing = await prisma.orderExam.findUnique({ where: { id: params.examId } })
  if (existing?.uploadedPdfPath?.startsWith("http")) {
    await del(existing.uploadedPdfPath).catch(() => {})
  }

  const blob = await put(`uploads/${randomUUID()}.pdf`, file, {
    access: "public",
    contentType: "application/pdf",
  })

  await prisma.orderExam.update({
    where: { id: params.examId },
    data: {
      uploadedPdfPath: blob.url,
      uploadedPdfName: file.name,
      status: "COMPLETADO",
      completedAt: new Date(),
    },
  })

  // Update parent order status
  const exam = await prisma.orderExam.findUnique({
    where: { id: params.examId },
    select: { orderId: true },
  })
  if (exam) {
    const allExams = await prisma.orderExam.findMany({
      where: { orderId: exam.orderId },
      select: { status: true },
    })
    const allDone = allExams.every(e => e.status === "COMPLETADO")
    await prisma.order.update({
      where: { id: exam.orderId },
      data: { status: allDone ? "COMPLETADA" : "EN_PROCESO" },
    })
  }

  return NextResponse.json({ path: blob.url, name: file.name })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { examId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === "CLINIC")
    return new NextResponse("No autorizado", { status: 401 })

  const exam = await prisma.orderExam.findUnique({ where: { id: params.examId } })
  if (exam?.uploadedPdfPath?.startsWith("http")) {
    await del(exam.uploadedPdfPath).catch(() => {})
  }

  await prisma.orderExam.update({
    where: { id: params.examId },
    data: { uploadedPdfPath: null, uploadedPdfName: null, status: "PENDIENTE", completedAt: null },
  })

  return NextResponse.json({ ok: true })
}
