import type { Metadata } from "next"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { portalAuthOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import OrderForm from "@/components/OrderForm"
import { catalogWhere } from "@/lib/catalog"
import { createPortalOrder } from "../actions"
import LoyaltyCard from "@/components/LoyaltyCard"
import { getLoyaltyStatuses } from "@/lib/loyalty"
import { HORARIO_GARANTIA, nextAllowedAt, pickupsEnabled } from "@/lib/pickups"
import { formatTime } from "@/lib/dates"

export const metadata: Metadata = { title: "Nueva solicitud · Portal Vet" }
export const dynamic = "force-dynamic"

export default async function NuevaSolicitudPage() {
  const session = await getServerSession(portalAuthOptions)
  if (!session || session.user.role !== "CLINIC") redirect("/portal-vet")

  const [templates, branches] = await Promise.all([
    prisma.examTemplate.findMany({ where: catalogWhere(session.user.clinicId ?? null), orderBy: [{ area: "asc" }, { name: "asc" }] }),
    prisma.clinicBranch.findMany({
      where: { clinicId: session.user.clinicId ?? "" },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, address: true },
    }),
  ])

  // Club Pets & Lab: barra corta en el momento de pedir (Pets & Pets no participa)
  const clinic = session.user.clinicId ? await prisma.clinic.findUnique({ where: { id: session.user.clinicId }, select: { noCharge: true } }) : null
  const loyalty = clinic && !clinic.noCharge ? (await getLoyaltyStatuses([session.user.clinicId!])).get(session.user.clinicId!) : undefined

  // Recogida (lib/pickups.ts): si hay una pendiente, lo nuevo se suma a ella; si no, cuándo puede pedir otra.
  // Con varias sedes se decide al enviar (por sede); aquí se muestra con la sede principal.
  const clinicId = session.user.clinicId ?? ""
  const withPickup = pickupsEnabled(clinicId) // interruptor de las recogidas con garantía
  const mainBranch = branches.length === 1 ? branches[0].id : null
  const pending = withPickup
    ? await prisma.pickup.findFirst({ where: { clinicId, status: "PENDIENTE", ...(branches.length <= 1 ? { branchId: mainBranch } : {}) }, orderBy: { createdAt: "desc" }, include: { _count: { select: { orders: true } } } })
    : null
  const wait = withPickup && !pending && branches.length <= 1 ? await nextAllowedAt(prisma, clinicId, mainBranch) : null

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-10 py-10">
      <Link href="/portal-vet/dashboard" className="font-mono text-[9px] tracking-[0.18em] text-ink-2 hover:text-ink uppercase">
        ← Mis solicitudes
      </Link>
      <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mt-4">{session.user.name}</p>
      <h1 className={`font-serif text-[28px] font-medium tracking-[-0.02em] mt-1 ${withPickup ? "mb-3" : "mb-6"}`}>{withPickup ? "Pedir recogida" : "Nueva solicitud de exámenes"}</h1>
      {!withPickup ? null : pending ? (
        <div className="bg-amber-50 border border-amber-200 px-4 py-3 mb-6 font-sans text-sm text-ink">
          Ya tienes una recogida pendiente ({pending._count.orders} {pending._count.orders === 1 ? "muestra" : "muestras"}). Esta muestra
          se suma a la misma recogida{pending.deadline ? <> y mantiene su garantía: <b>antes de las {formatTime(pending.deadline)}</b></> : ""}.
        </div>
      ) : wait ? (
        <div className="bg-amber-50 border border-amber-200 px-4 py-3 mb-6 font-sans text-sm text-ink">
          Ya pediste una recogida a las {formatTime(wait.last)}. Puedes pedir otra desde las <b>{formatTime(wait.allowedAt)}</b>.
        </div>
      ) : (
        <p className="font-sans text-sm text-ink-2 mb-6 max-w-xl">
          Pidiendo por aquí, <b className="text-ink">recogemos en máximo 1 h 30</b>. Si llegamos tarde, <b className="text-ink">50 % de descuento</b> en
          lo que recojamos en ese pedido. Garantía para pedidos de {HORARIO_GARANTIA.texto}.
        </p>
      )}
      {loyalty && <LoyaltyCard s={loyalty} compact />}
      <OrderForm
        templates={templates}
        branches={branches}
        action={createPortalOrder}
        submitLabel={!withPickup ? "Enviar solicitud →" : pending ? "Sumar a la recogida →" : "Pedir recogida →"}
        pendingLabel="Enviando…"
        readyCheck={withPickup}
      />
    </div>
  )
}
