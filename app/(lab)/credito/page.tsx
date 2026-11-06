import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { canManageCredit } from "@/lib/permissions"
import { getClinicCredits } from "@/lib/credit"
import CreditLinesManager from "./CreditLinesManager"

export const metadata: Metadata = { title: "Líneas de crédito" }
export const dynamic = "force-dynamic"

// Líneas de crédito por cliente: solo Michel, Guillermo y Germán (lib/permissions.ts: CREDIT_EMAILS; también en middleware)
export default async function CreditoPage() {
  const session = await getServerSession(authOptions)
  if (!canManageCredit(session?.user.role, session?.user.email)) redirect("/dashboard")

  const [clinics, lines, credits] = await Promise.all([
    prisma.clinic.findMany({ where: { noCharge: false }, orderBy: { name: "asc" }, select: { id: true, name: true, nit: true } }),
    prisma.creditLine.findMany({ include: { clinic: { select: { name: true } } }, orderBy: { clinic: { name: "asc" } } }),
    getClinicCredits(),
  ])

  const rows = lines.map(l => {
    const c = credits.get(l.clinicId)
    return {
      id: l.id, clinicId: l.clinicId, clinicName: l.clinic.name, limit: l.limit, termDays: l.termDays, active: l.active,
      used: c?.used ?? 0, overdue: c?.overdue ?? 0, inMora: !!c?.inMora,
      by: l.updatedByName ?? l.createdByName ?? "—",
      since: l.createdAt.toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "2-digit", month: "short", year: "numeric" }),
    }
  })

  return (
    <div className="px-4 py-5 md:px-8 md:py-8 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Comercial</p>
          <h1 className="font-serif text-[24px] md:text-[28px] font-medium tracking-[-0.02em] mt-1">Líneas de crédito</h1>
          <p className="font-sans text-[13px] text-ink-2 mt-1 max-w-2xl">
            Con una línea activa, al registrar el pago de una muestra del cliente aparece la opción <strong>Crédito</strong>: la
            clínica recibe el resultado sin pagar mientras esté al día, y la deuda vence a 15 o 30 días de cada factura.
          </p>
        </div>
        <Link href="/cartera" className="border border-salvia-700 text-salvia-700 font-mono text-[10px] tracking-[0.18em] uppercase px-4 py-2.5 hover:bg-salvia-50">
          Ver cartera →
        </Link>
      </div>
      <CreditLinesManager clinics={clinics} rows={rows} />
    </div>
  )
}
