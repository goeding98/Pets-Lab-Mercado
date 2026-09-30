import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { buildOrderPdf } from "@/lib/reportPdf"

export async function GET(
  req: Request,
  { params }: { params: { orderId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("No autorizado", { status: 401 })

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    include: {
      clinic: true,
      processedBy: true,
      exams: {
        include: {
          template: {
            include: {
              sections: {
                orderBy: { order: "asc" },
                include: { fields: { orderBy: { order: "asc" } } },
              },
            },
          },
          results: true,
          photos: { orderBy: { createdAt: "asc" }, select: { id: true, url: true } },
        },
      },
    },
  })

  if (!order) return new NextResponse("No encontrado", { status: 404 })

  // Clinics can only view their own orders
  if (session.user.role === "CLINIC") {
    if (order.clinic?.id !== session.user.clinicId) {
      return new NextResponse("No autorizado", { status: 403 })
    }
  }

  const bytes = await buildOrderPdf(order, order.exams)

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="PL-${order.orderNumber}.pdf"`,
    },
  })
}
