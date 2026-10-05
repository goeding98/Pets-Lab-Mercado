import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import ClinicaForm from "../ClinicaForm"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import BranchManager from "@/components/BranchManager"

export const metadata: Metadata = { title: "Editar clínica" }

export default async function EditarClinicaPage({ params }: { params: { id: string } }) {
  const clinic = await prisma.clinic.findUnique({
    where: { id: params.id },
    include: { branches: { orderBy: { createdAt: "asc" }, include: { _count: { select: { orders: true } } } } },
  })
  if (!clinic) notFound()
  const { branches, ...clinicData } = clinic

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/clientes" className="font-mono text-[9px] tracking-[0.18em] text-ink-2 hover:text-ink uppercase">
            ← Clientes
          </Link>
        </div>
        <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">{clinic.name}</h1>
      </div>

      <section className="mb-8">
        <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-1">Sedes ({branches.length})</p>
        <p className="font-sans text-xs text-ink-2 mb-3">
          Misma cuenta y NIT, distinta dirección. Al registrar una muestra de esta clínica se elige la sede.
        </p>
        <BranchManager
          clinicId={clinic.id}
          branches={branches.map(b => ({
            id: b.id, name: b.name, address: b.address, neighborhood: b.neighborhood, city: b.city, phone: b.phone, orders: b._count.orders,
          }))}
        />
      </section>

      <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-3">Datos de la cuenta</p>
      <ClinicaForm clinic={clinicData} canSetNoCharge={(await getServerSession(authOptions))?.user.role === "ADMIN"} />
    </div>
  )
}
