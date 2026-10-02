import type { Metadata } from "next"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import BranchManager from "@/components/BranchManager"

export const metadata: Metadata = { title: "Mis sedes · Portal Vet" }

export default async function MisSedesPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "CLINIC" || !session.user.clinicId) redirect("/portal-vet")

  const branches = await prisma.clinicBranch.findMany({
    where: { clinicId: session.user.clinicId },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { orders: true } } },
  })

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-10 py-10">
      <Link href="/portal-vet/dashboard" className="font-mono text-[9px] tracking-[0.18em] text-ink-2 hover:text-ink uppercase">
        ← Mis solicitudes
      </Link>
      <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mt-4">{session.user.name}</p>
      <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">Mis sedes</h1>
      <p className="font-sans text-sm text-ink-2 mt-2 mb-6 max-w-xl">
        Las sedes de tu clínica (mismo NIT, distinta dirección). Al solicitar exámenes eliges la sede, y en tus
        solicitudes verás de qué sede es cada una.
      </p>
      <BranchManager
        clinicId={session.user.clinicId}
        branches={branches.map(b => ({
          id: b.id, name: b.name, address: b.address, neighborhood: b.neighborhood, city: b.city, phone: b.phone, orders: b._count.orders,
        }))}
      />
    </div>
  )
}
