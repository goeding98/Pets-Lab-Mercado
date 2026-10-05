import type { Metadata } from "next"
import Link from "next/link"
import ClinicaForm from "../ClinicaForm"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const metadata: Metadata = { title: "Nueva clínica" }

export default async function NuevaClinicaPage() {
  const session = await getServerSession(authOptions)
  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-2xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/clientes" className="font-mono text-[9px] tracking-[0.18em] text-ink-2 hover:text-ink uppercase">
            ← Clientes
          </Link>
        </div>
        <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">Nueva clínica</h1>
      </div>
      <ClinicaForm canSetNoCharge={session?.user.role === "ADMIN"} />
    </div>
  )
}
