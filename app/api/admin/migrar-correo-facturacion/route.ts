import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// TEMPORAL: agrega Clinic.billingEmail ("correo de facturación", para Siigo) y lo llena con el correo
// actual de cada clínica. Idempotente. Solo ADMIN. Se quita en cuanto se aplique.
export async function POST() {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== "ADMIN") return new NextResponse("No autorizado", { status: 403 })
  await prisma.$executeRawUnsafe(`ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "billingEmail" TEXT`)
  const filled = await prisma.$executeRawUnsafe(
    `UPDATE "Clinic" SET "billingEmail" = lower(trim("email")) WHERE "billingEmail" IS NULL AND "email" IS NOT NULL AND trim("email") <> ''`,
  )
  const rows = await prisma.$queryRawUnsafe<{ total: number; con: number }[]>(
    `SELECT count(*)::int AS total, count("billingEmail")::int AS con FROM "Clinic"`,
  )
  return NextResponse.json({ filled, ...rows[0] })
}
