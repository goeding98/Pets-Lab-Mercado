import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import ClinicaForm from "../ClinicaForm"

export const metadata: Metadata = { title: "Editar clínica" }

export default async function EditarClinicaPage({ params }: { params: { id: string } }) {
  const clinic = await prisma.clinic.findUnique({ where: { id: params.id } })
  if (!clinic) notFound()

  return (
    <div className="px-8 py-8 max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/clientes" className="font-mono text-[9px] tracking-[0.18em] text-ink-2 hover:text-ink uppercase">
            ← Clientes
          </Link>
        </div>
        <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">{clinic.name}</h1>
      </div>
      <ClinicaForm clinic={clinic} />
    </div>
  )
}
