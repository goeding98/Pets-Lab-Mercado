import { NextRequest, NextResponse } from "next/server"
import { runAutoInvoicing } from "@/lib/siigoInvoicing"

// Facturación automática en Siigo (Vercel Cron, vercel.json: 04:00 UTC = 11 pm en Colombia): una factura por
// cliente por día con todo lo pendiente. Si existe CRON_SECRET, Vercel lo manda como Bearer y aquí se exige.
// Sin él, antes de las 10 pm solo se facturan días anteriores: llamar la ruta a deshoras no adelanta las de hoy.
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const hour = Number(new Date().toLocaleString("en-US", { timeZone: "America/Bogota", hour: "numeric", hour12: false }))
  try {
    const log = await runAutoInvoicing({ includeToday: hour >= 22, timeBudgetMs: 45000 })
    return NextResponse.json({ issued: log.issued.length, failed: log.failed.length, remaining: log.remaining })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
