import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { can } from "@/lib/permissions"
import { getInvoicing, type InvoiceFilter } from "@/lib/invoicing"

// Facturación en CSV (un examen por fila, con los datos del cliente), para Excel.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "facturacion")) return new NextResponse("No autorizado", { status: 403 })

  const q = new URL(req.url).searchParams
  const estado = (["pendientes", "facturadas", "todas"].includes(q.get("estado") ?? "") ? q.get("estado") : "pendientes") as InvoiceFilter["estado"]
  const { clients } = await getInvoicing({ estado, desde: q.get("desde") ?? undefined, hasta: q.get("hasta") ?? undefined, cliente: q.get("cliente") ?? undefined })

  const cell = (v: string | number | null) => {
    const s = v === null ? "" : String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = ["Cliente", "NIT / Cédula", "Teléfono", "Correo", "Dirección", "Orden", "Fecha", "Paciente", "Tutor", "Examen", "Precio lista", "Descuento", "Valor neto", "Total orden", "Pagado orden", "Factura N°"]
  const rows = clients.flatMap(c => c.orders.flatMap(o => o.lines.map(l => [
    c.name, c.nit, c.phone, c.email, c.address, o.orderNumber, o.date, o.patientName, o.ownerName,
    l.name, Math.round(l.price), Math.round(l.discount), Math.round(l.net), Math.round(o.total), Math.round(o.paid), o.invoiceNumber,
  ])))
  const csv = "﻿" + [header, ...rows].map(r => r.map(cell).join(";")).join("\r\n")
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="facturacion-${estado}.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
