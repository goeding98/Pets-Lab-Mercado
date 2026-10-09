import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { createCoproSeriado } from "@/lib/coproSeriado"

// TEMPORAL: crea el producto Coprológico Seriado en producción (una vez, idempotente). Solo ADMIN.
export async function POST() {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== "ADMIN") return new NextResponse("No autorizado", { status: 403 })
  return NextResponse.json({ result: await createCoproSeriado(prisma) })
}
