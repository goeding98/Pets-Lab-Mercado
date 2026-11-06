import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { computeNetPrice, getPaymentStatus as getExamPaymentStatus } from "@/lib/billing"
import { orderPayment } from "@/lib/payment"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { can } from "@/lib/permissions"
import { formatDateTime } from "@/lib/dates"
import { moraClinics } from "@/lib/credit"

export const metadata: Metadata = { title: "Muestras" }

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  SOLICITADA: { label: "Solicitada", className: "bg-amber-100 text-amber-900" },
  RECIBIDA: { label: "Recibida", className: "bg-salvia-100 text-salvia-800" },
  EN_PROCESO: { label: "En proceso", className: "bg-azul-100 text-azul-800" },
  COMPLETADA: { label: "Completada", className: "bg-salvia-700 text-bone" },
}

function getOrderPaymentStatus(
  exams: { price: number; discountType: string; discountValue: number; amountPaid: number }[]
) {
  if (exams.length === 0) return { label: "—", className: "bg-black/10 text-ink" }
  const labels = exams.map(e => getExamPaymentStatus(computeNetPrice(e.price, e.discountType, e.discountValue), e.amountPaid).label)
  const paidCount = labels.filter(l => l === "Pagado").length
  const unpaidCount = labels.filter(l => l === "No pagado" || l === "—").length
  if (paidCount === labels.length) return { label: "Pagado", className: "bg-azul-700 text-bone" }
  if (unpaidCount === labels.length) return { label: "No pagado", className: "bg-black/10 text-ink" }
  return { label: "Parcial", className: "bg-azul-100 text-azul-800" }
}

function PortalTag() {
  return (
    <span className="block w-fit mt-1 font-mono text-[7px] tracking-[0.18em] uppercase border border-salvia-700/40 text-salvia-700 px-1.5 py-px">
      Portal Vet
    </span>
  )
}

export default async function MuestrasPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string; sede?: string }
}) {
  // Sedes propias (Pets & Pets = cliente sin cobro): filtro rápido para el domiciliario que recoge en cada una
  const ownBranches = await prisma.clinicBranch.findMany({
    where: { clinic: { noCharge: true } },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  })
  const sede = ownBranches.find(b => b.id === searchParams.sede)?.id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (searchParams.status) where.status = searchParams.status
  if (sede) where.branchId = sede
  const q = searchParams.q?.trim()
  if (q) {
    // Sin distinguir mayúsculas: "Max" encuentra "MAX"
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { patientName: { contains: q, mode: "insensitive" } },
      { ownerName: { contains: q, mode: "insensitive" } },
      { clinic: { name: { contains: q, mode: "insensitive" } } },
    ]
  }
  const link = (params: Record<string, string | undefined>) => {
    const u = new URLSearchParams()
    for (const [k, v] of Object.entries({ q, status: searchParams.status, sede, ...params })) if (v) u.set(k, v)
    const str = u.toString()
    return str ? `/muestras?${str}` : "/muestras"
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { clinic: true, branch: { select: { name: true } }, exams: { include: { template: true } } },
  })

  const canSeeDeleted = can((await getServerSession(authOptions))?.user.role, "muestras.eliminar")
  // Clientes en mora (lib/credit.ts): sus órdenes a crédito sin pagar quedan retenidas
  const mora = await moraClinics(orders.filter(o => o.creditDays != null).map(o => o.clinicId))
  const rows = orders.map(order => {
    const pay = orderPayment(order.exams, order.clinic?.noCharge, { onCredit: order.creditDays != null, inMora: mora.has(order.clinicId ?? "") })
    return {
      order,
      s: STATUS_LABELS[order.status] ?? { label: order.status, className: "bg-black/10 text-ink" },
      p: order.clinic?.noCharge
        ? { label: "Sin cobro", className: "bg-salvia-50 text-salvia-700" }
        : pay.onCredit && !pay.fullyPaid
          ? { label: `Crédito ${order.creditDays}d`, className: "bg-azul-100 text-azul-800" }
          : getOrderPaymentStatus(order.exams),
      // Resultado listo pero sin pago: la clínica no lo ve (lib/payment.ts)
      retenido: order.exams.some(e => e.status === "COMPLETADO") && !pay.released,
    }
  })
  const badge = "font-mono text-[8px] tracking-[0.15em] uppercase px-2 py-0.5"

  return (
    <div className="px-4 py-5 md:px-8 md:py-8 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Muestras</p>
          <h1 className="font-serif text-[24px] md:text-[28px] font-medium tracking-[-0.02em] mt-1">Órdenes de laboratorio</h1>
          {canSeeDeleted && (
            <Link href="/muestras/eliminadas" className="font-mono text-[9px] tracking-[0.15em] uppercase text-ink-2 hover:text-ink hover:underline">
              Ver muestras eliminadas →
            </Link>
          )}
        </div>
        <Link
          href="/muestras/nueva"
          className="w-full sm:w-auto text-center bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.22em] uppercase px-5 py-3 hover:bg-salvia-800 transition-colors"
        >
          Nueva muestra +
        </Link>
      </div>

      {/* Sedes de Pets & Pets (el domiciliario recoge por sede) */}
      {ownBranches.length > 0 && (
        <div className="mb-3">
          <p className="font-mono text-[8px] tracking-[0.18em] uppercase text-ink-2 mb-1.5">Sede Pets &amp; Pets</p>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            {[{ id: undefined as string | undefined, name: "Todas" }, ...ownBranches].map(b => (
              <Link
                key={b.id ?? "todas"}
                href={link({ sede: b.id ?? "" })}
                className={`text-center font-sans text-sm px-4 py-2.5 border transition-colors ${
                  sede === b.id ? "bg-salvia-700 border-salvia-700 text-bone font-medium" : "bg-white border-black/20 text-ink hover:border-salvia-700"
                }`}
              >
                {b.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Búsqueda y estado */}
      <form method="get" className="grid grid-cols-[1fr_auto] sm:flex gap-2 mb-5">
        {sede && <input type="hidden" name="sede" value={sede} />}
        <input
          name="q"
          type="search"
          defaultValue={searchParams.q}
          placeholder="Buscar paciente, dueño, N° orden…"
          className="col-span-2 sm:flex-1 border border-black/20 bg-white px-3 py-2.5 text-base sm:text-sm font-sans focus:outline-2 focus:outline-salvia-700"
        />
        <select
          name="status"
          defaultValue={searchParams.status ?? ""}
          className="border border-black/20 bg-white px-3 py-2.5 text-base sm:text-sm font-sans focus:outline-2 focus:outline-salvia-700"
        >
          <option value="">Todos los estados</option>
          <option value="SOLICITADA">Solicitada (portal)</option>
          <option value="RECIBIDA">Recibida</option>
          <option value="EN_PROCESO">En proceso</option>
          <option value="COMPLETADA">Completada</option>
        </select>
        <button type="submit" className="bg-salvia-700 text-bone font-mono text-[9px] tracking-[0.18em] uppercase px-5 py-2.5">
          Buscar
        </button>
      </form>

      <p className="font-sans text-xs text-ink-2 mb-2">{orders.length} {orders.length === 1 ? "orden" : "órdenes"}</p>

      {/* Celular: una tarjeta por orden */}
      <div className="md:hidden space-y-2.5">
        {rows.map(({ order, s, p, retenido }) => (
          <Link key={order.id} href={`/muestras/${order.id}`} className="block bg-white border border-black/10 px-4 py-3 active:bg-salvia-50">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-sans text-[15px] font-medium text-ink leading-tight">
                  {order.patientName} <span className="font-normal text-ink-2 text-sm">· {order.species}</span>
                </p>
                <p className="font-sans text-xs text-ink-2 mt-0.5">
                  {order.clinic?.name ?? "Particular"}{order.branch && <> · <span className="text-salvia-700 font-medium">{order.branch.name}</span></>}
                </p>
              </div>
              <span className={`${s.className} ${badge} shrink-0`}>{s.label}</span>
            </div>
            <ul className="mt-2 space-y-0.5">
              {order.exams.map(e => (
                <li key={e.id} className="font-sans text-[13px] text-ink before:content-['•'] before:text-salvia-700 before:mr-1.5">{e.template.name}</li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2.5 font-mono text-[10px] text-ink-2">
              <span className="text-salvia-700">{order.orderNumber}</span>
              <span>{formatDateTime(order.createdAt)}</span>
              {order.source === "PORTAL" && <span className="uppercase tracking-[0.12em] text-[8px] border border-salvia-700/40 text-salvia-700 px-1.5 py-px">Portal Vet</span>}
              <span className={`${p.className} ${badge}`}>{p.label}</span>
              {retenido && <span className={`${badge} bg-red-100 text-red-800`}>Retenido</span>}
            </div>
          </Link>
        ))}
        {orders.length === 0 && <EmptyState filtered={!!(q || sede || searchParams.status)} />}
      </div>

      {/* Computador: tabla */}
      <div className="hidden md:block border border-black/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-salvia-50 border-b border-black/10">
              {["N° Orden", "Paciente / Especie", "Clínica", "Exámenes", "Fecha y hora", "Estado", "Pago", ""].map(h => (
                <th key={h} className="text-left px-4 py-2.5 font-mono text-[8px] tracking-[0.18em] uppercase text-salvia-700">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ order, s, p, retenido }, i) => (
              <tr key={order.id} className={`border-b border-black/[0.06] hover:bg-salvia-50/50 transition-colors ${i % 2 !== 0 ? "bg-black/[0.015]" : ""}`}>
                <td className="px-4 py-3">
                  <Link href={`/muestras/${order.id}`} className="font-mono text-[11px] text-salvia-700 hover:underline">
                    {order.orderNumber}
                  </Link>
                  {order.source === "PORTAL" && <PortalTag />}
                </td>
                <td className="px-4 py-3 font-sans text-xs">
                  {order.patientName}
                  <span className="text-ink-2 ml-1">({order.species})</span>
                </td>
                <td className="px-4 py-3 font-sans text-xs text-ink-2">{order.clinic?.name ?? "—"}{order.branch && <span className="block font-mono text-[8px] tracking-[0.12em] uppercase text-salvia-700 mt-0.5">Sede {order.branch.name}</span>}</td>
                <td className="px-4 py-3 font-sans text-xs text-ink-2 min-w-[180px]">
                  {order.exams.map(e => <span key={e.id} className="block">{e.template.name}</span>)}
                </td>
                <td className="px-4 py-3 font-mono text-[10px] text-ink-2">{formatDateTime(order.createdAt)}</td>
                <td className="px-4 py-3"><span className={`${s.className} ${badge}`}>{s.label}</span></td>
                <td className="px-4 py-3">
                  <span className={`${p.className} ${badge}`}>{p.label}</span>
                  {retenido && (
                    <span className="block w-fit mt-1 font-mono text-[7px] tracking-[0.15em] uppercase bg-red-100 text-red-800 px-1.5 py-0.5" title="Resultado listo pero sin pago: la clínica no lo ve">
                      Retenido
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/muestras/${order.id}`} className="font-mono text-[9px] tracking-[0.15em] text-salvia-700 hover:underline uppercase">
                    Ver →
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8}><EmptyState filtered={!!(q || sede || searchParams.status)} /></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <p className="px-4 py-8 text-center font-sans text-xs text-ink-2">
      {filtered ? "Ninguna orden coincide con el filtro." : "No hay órdenes."}{" "}
      <Link href="/muestras/nueva" className="text-salvia-700 hover:underline">Registrar nueva muestra →</Link>
    </p>
  )
}
