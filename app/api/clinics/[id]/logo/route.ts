import { NextResponse } from "next/server"
import { get } from "@vercel/blob"
import { getStaffSession } from "@/lib/auth"
import { prisma } from "@/lib/db"

// Logo de la clínica para sus reportes (Blob privado): lo ve el personal en la ficha de la clínica
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await getStaffSession())) return new NextResponse("No autorizado", { status: 401 })
  const clinic = await prisma.clinic.findUnique({ where: { id: params.id }, select: { logoUrl: true } })
  if (!clinic?.logoUrl) return new NextResponse("Sin logo", { status: 404 })
  const blob = await get(clinic.logoUrl, { access: "private" }).catch(() => null)
  if (!blob?.stream) return new NextResponse("No encontrado", { status: 404 })
  return new NextResponse(blob.stream as unknown as BodyInit, {
    status: 200,
    headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" },
  })
}
