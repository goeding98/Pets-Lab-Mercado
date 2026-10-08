import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { buildOrderPdf } from "@/lib/reportPdf"
import { getOrinaConfig } from "@/lib/settings"
import { orderPayment } from "@/lib/payment"
import { readShareToken } from "@/lib/shareLink"

// PDF compartido por WhatsApp (sin sesión): /r/<token firmado> → reporte de la orden o de un examen.
// Igual que el Portal Vet, no se entrega si la orden está retenida por pago (lib/payment.ts).

const safeFilename = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 ._-]+/g, "-").replace(/-{2,}/g, "-")

const examInclude = {
  template: { include: { sections: { orderBy: { order: "asc" as const }, include: { fields: { orderBy: { order: "asc" as const } } } } } },
  results: true,
  photos: { orderBy: { createdAt: "asc" as const }, select: { id: true, url: true, role: true } },
}

function message(text: string, status: number) {
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pets &amp; Lab</title>` +
      `<body style="font-family:system-ui,sans-serif;max-width:480px;margin:15vh auto;padding:0 20px;color:#1f2a24">` +
      `<h1 style="font-size:20px">Pets &amp; Lab</h1><p>${text}</p></body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  )
}

export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const target = readShareToken(params.token)
  if (!target) return message("Este enlace no es válido o ya venció. Pide el resultado de nuevo al laboratorio.", 404)

  const orderId = target.kind === "o"
    ? target.id
    : (await prisma.orderExam.findUnique({ where: { id: target.id }, select: { orderId: true } }))?.orderId
  if (!orderId) return message("No encontramos este resultado.", 404)

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      clinic: true, branch: true, processedBy: true,
      exams: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: examInclude },
    },
  })
  if (!order) return message("No encontramos este resultado.", 404)
  if (!orderPayment(order.exams, order.clinic?.noCharge).released) {
    return message("El resultado estará disponible cuando se registre el pago. Comunícate con el laboratorio.", 402)
  }

  const exams = target.kind === "o" ? order.exams : order.exams.filter(e => e.id === target.id)
  if (!exams.some(e => e.status === "COMPLETADO")) return message("Este resultado aún no está listo.", 404)

  const bytes = await buildOrderPdf({ ...order, orinaConfig: await getOrinaConfig() }, exams)
  const name = target.kind === "o" ? `PL-${order.orderNumber}` : `${order.orderNumber}-${exams[0].template.name}`
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
      "Content-Disposition": `inline; filename="${safeFilename(`${name} ${order.patientName}`)}.pdf"`,
    },
  })
}

export const maxDuration = 60
