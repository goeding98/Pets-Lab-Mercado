import type { Metadata } from "next"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import OrderForm from "@/components/OrderForm"
import { createPortalOrder } from "../actions"

export const metadata: Metadata = { title: "Nueva solicitud · Portal Vet" }

export default async function NuevaSolicitudPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "CLINIC") redirect("/portal-vet")

  const templates = await prisma.examTemplate.findMany({ orderBy: [{ area: "asc" }, { name: "asc" }] })

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-10 py-10">
      <Link href="/portal-vet/dashboard" className="font-mono text-[9px] tracking-[0.18em] text-ink-2 hover:text-ink uppercase">
        ← Mis solicitudes
      </Link>
      <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mt-4">{session.user.name}</p>
      <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1 mb-6">Nueva solicitud de exámenes</h1>
      <OrderForm
        templates={templates}
        action={createPortalOrder}
        submitLabel="Enviar solicitud →"
        pendingLabel="Enviando…"
      />
    </div>
  )
}
