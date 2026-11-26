import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { canSeeBonos } from "@/lib/permissions"
import { monthBonus, validMonth } from "@/lib/bonus"
import { BONO_PAQUETE } from "@/lib/routeDay"

const ESTADO = { CONFIRMADO: "Confirmado", POR_CONFIRMAR: "Por confirmar", ANULADO: "Anulado" } as const

// Paquetes no agendados del mes en CSV (uno por fila), para Excel. Michel, Guillermo y Comercial.
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!canSeeBonos(session?.user.role, session?.user.email)) return new NextResponse("No autorizado", { status: 403 })

  const month = validMonth(new URL(req.url).searchParams.get("mes"))
  const data = await monthBonus(month)
  const cell = (v: string | number) => {
    const s = String(v)
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = ["Mensajero", "Fecha", "Hora", "Ruta", "Clínica", "Órdenes", "Estado", "Valor"]
  const rows = data.flatMap(r => r.packages.map(p => [
    r.userName, p.day,
    new Date(p.at).toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "2-digit", minute: "2-digit" }),
    p.color, p.name, p.orders.map(o => `${o.orderNumber} ${o.patientName}`).join(", "),
    ESTADO[p.status], p.status === "CONFIRMADO" ? BONO_PAQUETE : 0,
  ]))
  // Punto y coma + BOM: Excel en español lo abre en columnas y con tildes
  const csv = "﻿" + [header, ...rows].map(r => r.map(cell).join(";")).join("\r\n")
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="beneficio-mensajeros-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  })
}
