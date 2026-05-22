import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { renderToBuffer } from "@react-pdf/renderer"
import { PdfReport } from "@/components/PdfReport"
import React from "react"

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
        },
      },
    },
  })

  if (!order) return new NextResponse("No encontrado", { status: 404 })

  // Only include manually-entered exams (exclude uploaded PDFs)
  order.exams = order.exams.filter(e => !e.uploadedPdfPath)

  // Clinics can only view their own orders
  if (session.user.role === "CLINIC") {
    if (order.clinic?.id !== session.user.clinicId) {
      return new NextResponse("No autorizado", { status: 403 })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const render = renderToBuffer as (el: any) => Promise<Buffer>
  const buffer = await render(React.createElement(PdfReport, { order }))

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="PL-${order.orderNumber}.pdf"`,
    },
  })
}
