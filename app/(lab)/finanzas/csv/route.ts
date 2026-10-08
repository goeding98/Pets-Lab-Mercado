import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { canSeeFinance } from "@/lib/permissions"
import { computeNetPrice } from "@/lib/billing"
import { dayKey, resolvePeriod } from "@/lib/finance"

// Detalle del dashboard financiero en CSV (un examen por fila), para Excel. Solo gerencia.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!canSeeFinance(session?.user.role, session?.user.email)) return new NextResponse("No autorizado", { status: 403 })

  const q = new URL(req.url).searchParams
  const period = resolvePeriod(q.get("periodo") ?? undefined, q.get("desde") ?? undefined, q.get("hasta") ?? undefined)
  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: period.start, lt: period.end } },
    orderBy: { createdAt: "asc" },
    include: {
      clinic: { select: { name: true, noCharge: true } }, branch: { select: { name: true } },
      exams: { include: { template: { select: { name: true, area: true } } } },
    },
  })

  const cell = (v: string | number) => {
    const s = String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = ["Fecha", "Orden", "Paciente", "Especie", "Clínica", "Sede", "Sin cobro", "Origen", "Examen", "Categoría", "Precio lista", "Descuento", "Neto", "Pagado", "Saldo", "Medio de pago", "Estado examen"]
  const rows = orders.flatMap(o => o.exams.map(e => {
    const net = computeNetPrice(e.price, e.discountType, e.discountValue)
    const paid = Math.min(e.amountPaid, net)
    return [
      dayKey(o.createdAt), o.orderNumber, o.patientName, o.species, o.clinic?.name ?? "", o.branch?.name ?? "",
      o.clinic?.noCharge ? "Sí" : "No", o.source === "PORTAL" ? "Portal Vet" : "Laboratorio",
      e.template.name, e.template.area, Math.round(e.price), Math.round(e.price - net), Math.round(net), Math.round(paid),
      Math.round(net - paid), e.paymentMethod === "TRANSFERENCIA" ? "Transferencia" : "Efectivo", e.status === "COMPLETADO" ? "Completado" : "Pendiente",
    ]
  }))
  // Punto y coma + BOM: Excel en español lo abre en columnas y con tildes
  const csv = "﻿" + [header, ...rows].map(r => r.map(cell).join(";")).join("\r\n")
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="finanzas-${period.from}-a-${period.to}.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
