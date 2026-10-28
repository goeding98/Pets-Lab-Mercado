import { NextResponse } from "next/server"
import { getAnySession } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { get } from "@vercel/blob"
import { buildOrderPdf } from "@/lib/reportPdf"
import { getOrinaConfig } from "@/lib/settings"
import { orderPayment } from "@/lib/payment"
import { examParts } from "@/lib/reportParts"

// Los encabezados HTTP no admiten caracteres como "–" o "₃": nombre de archivo solo en ASCII
const safeFilename = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 ._-]+/g, "-").replace(/-{2,}/g, "-")

export async function GET(
  req: Request,
  { params }: { params: { examId: string } }
) {
  const session = await getAnySession()
  if (!session) return new NextResponse("No autorizado", { status: 401 })

  const orderExam = await prisma.orderExam.findUnique({
    where: { id: params.examId },
    include: {
      order: { include: { clinic: true, branch: true, processedBy: true, exams: { select: { price: true, discountType: true, discountValue: true, amountPaid: true } } } },
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
  })

  if (!orderExam) return new NextResponse("No encontrado", { status: 404 })

  // Las clínicas solo ven exámenes de sus propias órdenes
  if (session.user.role === "CLINIC" && orderExam.order.clinicId !== session.user.clinicId) {
    return new NextResponse("No autorizado", { status: 403 })
  }
  // Sin pago no se entrega el resultado (ver lib/payment.ts)
  if (session.user.role === "CLINIC" && !orderPayment(orderExam.order.exams, orderExam.order.clinic?.noCharge).released) {
    return new NextResponse("Resultado pendiente de pago: se libera cuando el laboratorio registre el pago.", { status: 402 })
  }

  // ?parts=Hemograma|Coprológico: reporte solo de esas partes del perfil (lib/reportParts.ts). Solo el personal:
  // puede salir con un borrador; a la clínica le llega por el enlace firmado que el personal decide mandar.
  const parts = (new URL(req.url).searchParams.get("parts") ?? "").split("|").filter(p => examParts(orderExam.template).includes(p))
  if (parts.length && session.user.role !== "CLINIC") {
    const { order: { exams: _b, ...order }, ...exam } = orderExam
    const bytes = await buildOrderPdf({ ...order, orinaConfig: await getOrinaConfig() }, [{ ...exam, onlyParts: parts }])
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "no-store",
        "Content-Disposition": `inline; filename="${safeFilename(`${order.orderNumber}-${parts.join("-")}`)}.pdf"`,
      },
    })
  }

  const hasNotes = !!orderExam.comments || orderExam.photos.some(p => !p.role)
  const captured = orderExam.results.some(r => r.value.trim()) || orderExam.structured !== null

  // PDF subido sin resultados capturados, comentarios ni fotos: se sirve tal cual (proxy del Blob para
  // conservar el nombre)
  if (orderExam.uploadedPdfPath?.startsWith("http") && !hasNotes && !captured) {
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

  const { order: { exams: _billing, ...order }, ...exam } = orderExam
  const bytes = await buildOrderPdf({ ...order, orinaConfig: await getOrinaConfig() }, [exam])

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

// Un reporte con muchos exámenes puede tardar varios segundos (consultas + render del PDF): margen
// para que no lo corte el límite por defecto de las funciones de Vercel.
export const maxDuration = 60
