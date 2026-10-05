import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"
import { get, del } from "@vercel/blob"
import { orderPayment } from "@/lib/payment"

// Sirve una foto de un examen (el blob es privado: se hace proxy con la sesión)
export async function GET(
  req: NextRequest,
  { params }: { params: { photoId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("No autorizado", { status: 401 })

  const photo = await prisma.examPhoto.findUnique({
    where: { id: params.photoId },
    include: { orderExam: { select: { order: { select: { clinicId: true, clinic: { select: { noCharge: true } }, exams: { select: { price: true, discountType: true, discountValue: true, amountPaid: true } } } } } } },
  })
  if (!photo) return new NextResponse("No encontrado", { status: 404 })

  // Las clínicas solo ven fotos de sus propias órdenes, y solo con el resultado liberado (pago)
  if (session.user.role === "CLINIC") {
    const order = photo.orderExam.order
    if (order.clinicId !== session.user.clinicId) return new NextResponse("No autorizado", { status: 403 })
    if (!orderPayment(order.exams, order.clinic?.noCharge).released) return new NextResponse("Resultado pendiente de pago: se libera cuando el laboratorio registre el pago.", { status: 402 })
  }

  const blob = await get(photo.url, { access: "private" })
  if (!blob?.stream) return new NextResponse("No encontrado", { status: 404 })

  return new NextResponse(blob.stream as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { photoId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "resultados.editar"))
    return new NextResponse("No autorizado", { status: 401 })

  const photo = await prisma.examPhoto.findUnique({ where: { id: params.photoId } })
  if (!photo) return new NextResponse("No encontrado", { status: 404 })

  await del(photo.url).catch(() => {})
  await prisma.examPhoto.delete({ where: { id: photo.id } })

  return NextResponse.json({ ok: true })
}
