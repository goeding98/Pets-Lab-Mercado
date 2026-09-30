import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"
import { put } from "@vercel/blob"
import { randomUUID } from "crypto"

// Sube una foto a un examen de una orden. El navegador ya la manda comprimida a JPEG
// (ver ExamResultForm), así cabe en el límite de Vercel y se puede incrustar en el PDF.
export async function POST(
  req: NextRequest,
  { params }: { params: { examId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "resultados.editar"))
    return new NextResponse("No autorizado", { status: 401 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return new NextResponse("Sin archivo", { status: 400 })
  if (file.type !== "image/jpeg") return new NextResponse("La foto debe ser JPEG", { status: 400 })

  const exam = await prisma.orderExam.findUnique({ where: { id: params.examId }, select: { orderId: true } })
  if (!exam) return new NextResponse("Examen no encontrado", { status: 404 })

  const blob = await put(`photos/${randomUUID()}.jpg`, file, {
    access: "private",
    contentType: "image/jpeg",
  })

  const photo = await prisma.examPhoto.create({
    data: { orderExamId: params.examId, url: blob.url, name: file.name || "foto.jpg" },
    select: { id: true, name: true },
  })

  return NextResponse.json(photo)
}
