import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { buildOrderPdf } from "@/lib/reportPdf"
import { getOrinaConfig } from "@/lib/settings"
import { orderPayment } from "@/lib/payment"
import { readShareToken } from "@/lib/shareLink"
import { examParts } from "@/lib/reportParts"

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

  // p = partes de un perfil: "<examId>~<índices>"
  const [examId, partIdx] = target.kind === "p" ? target.id.split("~") : [target.id, ""]
  const orderId = target.kind === "o"
    ? target.id
    : (await prisma.orderExam.findUnique({ where: { id: examId }, select: { orderId: true } }))?.orderId
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

  const exams = target.kind === "o" ? order.exams : order.exams.filter(e => e.id === examId)
  let onlyParts: string[] = []
  if (target.kind === "p") {
    const all = exams[0] ? examParts(exams[0].template) : []
    onlyParts = partIdx.split("-").map(Number).map(i => all[i]).filter((p): p is string => !!p)
    if (onlyParts.length === 0) return message("No encontramos este resultado.", 404)
  } else if (!exams.some(e => e.status === "COMPLETADO")) return message("Este resultado aún no está listo.", 404)

  const bytes = await buildOrderPdf({ ...order, orinaConfig: await getOrinaConfig() }, onlyParts.length ? [{ ...exams[0], onlyParts }] : exams)
  const name = target.kind === "o" ? `PL-${order.orderNumber}` : `${order.orderNumber}-${onlyParts.length ? onlyParts.join("-") : exams[0].template.name}`
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
