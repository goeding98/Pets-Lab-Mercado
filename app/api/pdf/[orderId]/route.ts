import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { renderToBuffer } from "@react-pdf/renderer"
import { PdfReport } from "@/components/PdfReport"
import React from "react"
import { get } from "@vercel/blob"
import { PDFDocument } from "pdf-lib"

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

  // Clinics can only view their own orders
  if (session.user.role === "CLINIC") {
    if (order.clinic?.id !== session.user.clinicId) {
      return new NextResponse("No autorizado", { status: 403 })
    }
  }

  const manualExams = order.exams.filter(e => !e.uploadedPdfPath)
  const uploadedExams = order.exams.filter(e => e.uploadedPdfPath)

  const mergedPdf = await PDFDocument.create()

  // Structured report for manually-entered exams
  if (manualExams.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const render = renderToBuffer as (el: any) => Promise<Buffer>
    const reportBuffer = await render(
      React.createElement(PdfReport, { order: { ...order, exams: manualExams } })
    )
    const reportDoc = await PDFDocument.load(reportBuffer)
    const pages = await mergedPdf.copyPages(reportDoc, reportDoc.getPageIndices())
    pages.forEach(p => mergedPdf.addPage(p))
  }

  // Append each uploaded PDF (lab reports scanned/uploaded outside the system)
  for (const exam of uploadedExams) {
    try {
      const blob = await get(exam.uploadedPdfPath as string, { access: "private" })
      if (!blob?.stream) continue
      const chunks: Uint8Array[] = []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for await (const chunk of blob.stream as any) chunks.push(chunk)
      const bytes = Buffer.concat(chunks)
      const uploadedDoc = await PDFDocument.load(bytes, { ignoreEncryption: true })
      const pages = await mergedPdf.copyPages(uploadedDoc, uploadedDoc.getPageIndices())
      pages.forEach(p => mergedPdf.addPage(p))
    } catch {
      // Skip exams whose uploaded file can't be read/merged rather than failing the whole report
    }
  }

  const mergedBytes = await mergedPdf.save()

  return new NextResponse(Buffer.from(mergedBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="PL-${order.orderNumber}.pdf"`,
    },
  })
}
