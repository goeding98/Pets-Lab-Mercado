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
      branch: true,
      processedBy: true,
      exams: {
        // Orden fijo: sin esto Postgres devuelve primero o al final el examen recién actualizado
        // y las tarjetas cambian de lugar al guardar (parece que "se borra" lo digitado).
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
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
          photos: { orderBy: { createdAt: "asc" }, select: { id: true, url: true, role: true } },
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
      // Siempre generar de nuevo: si el navegador guarda una copia, se ven formatos/datos viejos
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="PL-${order.orderNumber}.pdf"`,
    },
  })
}
