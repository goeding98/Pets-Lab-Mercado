import { NextRequest, NextResponse } from "next/server"
import { ensureLoyaltyClosed } from "@/lib/loyalty"

// Cierre de cortes del Club Pets & Lab (Vercel Cron, vercel.json: 05:10 UTC = 12:10 am en Colombia): el día 16 y el 1
// cierra el corte anterior y crea los descuentos automáticos. Idempotente. Exige CRON_SECRET si existe.
export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  try {
    return NextResponse.json({ closed: await ensureLoyaltyClosed() })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
