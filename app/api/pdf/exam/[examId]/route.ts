import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { renderToBuffer } from "@react-pdf/renderer"
import { PdfReport } from "@/components/PdfReport"
import React from "react"
import path from "path"
import fs from "fs"

export async function GET(
  req: Request,
  { params }: { params: { examId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return new NextResponse("No autorizado", { status: 401 })

  const orderExam = await prisma.orderExam.findUnique({
    where: { id: params.examId },
    include: {
      order: { include: { clinic: true, processedBy: true } },
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
  })

  if (!orderExam) return new NextResponse("No encontrado", { status: 404 })

  // Serve uploaded PDF directly
  if (orderExam.uploadedPdfPath) {
    const filePath = path.join(process.cwd(), "public", orderExam.uploadedPdfPath)
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath)
      return new NextResponse(buffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${orderExam.uploadedPdfName ?? "reporte.pdf"}"`,
        },
      })
    }
  }

  // Generate formatted PDF for this single exam
  const orderData = {
    ...orderExam.order,
    exams: [{ id: orderExam.id, template: orderExam.template, results: orderExam.results }],
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const render = renderToBuffer as (el: any) => Promise<Buffer>
  const buffer = await render(React.createElement(PdfReport, { order: orderData }))

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${orderExam.order.orderNumber}-${orderExam.template.name}.pdf"`,
    },
  })
}
