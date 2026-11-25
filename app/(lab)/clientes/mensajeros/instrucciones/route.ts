import React from "react"
import { NextResponse } from "next/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { getStaffSession } from "@/lib/auth"
import { can } from "@/lib/permissions"
import { loadMessengerData } from "@/lib/messengerData"
import { calcular } from "@/lib/messengerRoutes"
import { getManualRoutes, planFor } from "@/lib/manualRoutes"
import { MessengerInstructionsPdf } from "@/components/MessengerInstructionsPdf"

export const dynamic = "force-dynamic"

// PDF "Instrucciones para mensajeros" con el plan que se ve en /clientes/mensajeros (mismos n, umbral y Pets & Pets).
export async function GET(req: Request) {
  const session = await getStaffSession()
  if (!session || !can(session.user.role, "mensajeros")) return new NextResponse("No autorizado", { status: 403 })

  const q = new URL(req.url).searchParams
  const clamp = (v: string | null, def: number, min: number, max: number) => {
    const n = Number(v)
    return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : def
  }
  const n = clamp(q.get("n"), 2, 1, 4)
  const umbral = clamp(q.get("u"), 6, 1, 100)
  const conPP = q.get("pp") !== "0"

  // Con mapa armado a mano ("Armar mapa") salen esas rutas; si no, el automático con los valores de la pantalla
  const [{ lab, points }, manual] = await Promise.all([loadMessengerData(), getManualRoutes()])
  const plan = manual ? planFor(lab, points, manual) : calcular(lab, points.filter(p => p.m > 0 && (conPP || !p.own)), n, umbral)
  const fecha = new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "long", year: "numeric" })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const render = renderToBuffer as (el: any) => Promise<Buffer>
  const bytes = await render(React.createElement(MessengerInstructionsPdf, { rutas: plan.rutas, fecha }))

  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="Instrucciones-mensajeros.pdf"`,
    },
  })
}

export const maxDuration = 60
