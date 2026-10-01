import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { get } from "@vercel/blob"
import { buildOrderPdf } from "@/lib/reportPdf"

// Los encabezados HTTP no admiten caracteres como "–" o "₃": nombre de archivo solo en ASCII
const safeFilename = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 ._-]+/g, "-").replace(/-{2,}/g, "-")

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
      photos: { orderBy: { createdAt: "asc" }, select: { id: true, url: true } },
    },
  })

  if (!orderExam) return new NextResponse("No encontrado", { status: 404 })

  const hasNotes = !!orderExam.comments || orderExam.photos.length > 0

  // PDF subido sin comentarios ni fotos: se sirve tal cual (proxy del Blob para conservar el nombre)
  if (orderExam.uploadedPdfPath?.startsWith("http") && !hasNotes) {
    const blob = await get(orderExam.uploadedPdfPath, { access: "private" })
    if (blob?.stream) {
      return new NextResponse(blob.stream as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          // Siempre generar de nuevo: si el navegador guarda una copia, se ven formatos/datos viejos
          "Cache-Control": "no-store",
          "Content-Disposition": `inline; filename="${safeFilename(orderExam.uploadedPdfName ?? "reporte.pdf")}"`,
        },
      })
    }
  }

  const { order, ...exam } = orderExam
  const bytes = await buildOrderPdf(order, [exam])

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      // Siempre generar de nuevo: si el navegador guarda una copia, se ven formatos/datos viejos
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="${safeFilename(`${order.orderNumber}-${orderExam.template.name}`)}.pdf"`,
    },
  })
}
