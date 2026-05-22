import type { Metadata } from "next"
import Link from "next/link"
import ClinicaForm from "../ClinicaForm"

export const metadata: Metadata = { title: "Nueva clínica" }

export default function NuevaClinicaPage() {
  return (
    <div className="px-8 py-8 max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/clientes" className="font-mono text-[9px] tracking-[0.18em] text-ink-2 hover:text-ink uppercase">
            ← Clientes
          </Link>
        </div>
        <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">Nueva clínica</h1>
      </div>
      <ClinicaForm />
    </div>
  )
}
