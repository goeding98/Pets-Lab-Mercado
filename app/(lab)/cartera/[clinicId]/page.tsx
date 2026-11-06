import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can, canSeeCartera } from "@/lib/permissions"
import { daysBetween, getClinicCredit, todayKey } from "@/lib/credit"
import { PAYMENT_METHODS, formatCOP } from "@/lib/payment"
import { formatDateTime } from "@/lib/dates"
import PaymentForm, { DeletePaymentButton } from "./PaymentForm"

export const metadata: Metadata = { title: "Cartera" }
export const dynamic = "force-dynamic"

const fmtDay = (d: string) => d.split("-").reverse().join("/")

export default async function CarteraClientePage({ params }: { params: { clinicId: string } }) {
  const session = await getServerSession(authOptions)
  if (!canSeeCartera(session?.user.role, session?.user.email)) redirect("/dashboard")

  const clinic = await prisma.clinic.findUnique({
    where: { id: params.clinicId },
    select: { id: true, name: true, nit: true, phone: true, email: true, billingEmail: true, contactName: true },
  })
  if (!clinic) notFound()
  const [credit, payments] = await Promise.all([
    getClinicCredit(clinic.id),
    prisma.creditPayment.findMany({ where: { clinicId: clinic.id }, orderBy: { createdAt: "desc" }, take: 50 }),
  ])
  const today = todayKey()
  const canOpenOrders = can(session?.user.role, "muestras.ver")
  const methodLabel = (m: string) => PAYMENT_METHODS.find(x => x.value === m)?.label ?? m

  return (
    <div className="px-4 py-5 md:px-8 md:py-8 max-w-5xl">
      <Link href="/cartera" className="font-mono text-[9px] tracking-[0.18em] uppercase text-ink-2 hover:text-ink">← Cartera</Link>
      <h1 className="font-serif text-[24px] md:text-[28px] font-medium tracking-[-0.02em] mt-2">{clinic.name}</h1>
      <p className="font-sans text-xs text-ink-2 mt-1">
        {[clinic.nit && `NIT ${clinic.nit}`, clinic.contactName, clinic.phone, clinic.billingEmail ?? clinic.email].filter(Boolean).join(" · ")}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-6">
        {([
          ["Cupo", credit.line ? `${formatCOP(credit.line.limit)} · ${credit.line.termDays} d${credit.line.active ? "" : " (cerrada)"}` : "Sin línea", ""],
          ["Debe", formatCOP(credit.used), ""],
          ["Vencido", formatCOP(credit.overdue), credit.overdue > 0 ? "text-red-700" : ""],
          ["Disponible", credit.line ? formatCOP(Math.max(credit.line.limit - credit.used, 0)) : "—", credit.overLimit ? "text-amber-800" : ""],
        ] as const).map(([l, v, cls]) => (
          <div key={l} className="border border-black/10 bg-white px-4 py-3">
            <p className="font-mono text-[8px] tracking-[0.18em] uppercase text-ink-2 mb-0.5">{l}</p>
            <p className={`font-sans text-base md:text-lg font-medium ${cls || "text-ink"}`}>{v}</p>
          </div>
        ))}
      </div>

      {credit.used > 0 && <PaymentForm clinicId={clinic.id} debt={credit.used} today={today} />}

      <h2 className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mt-8 mb-2">Órdenes pendientes</h2>
      {credit.orders.length === 0 ? (
        <p className="border border-black/10 bg-white px-4 py-6 text-center font-sans text-sm text-ink-2">No tiene órdenes a crédito pendientes.</p>
      ) : (
        <div className="border border-black/10 bg-white overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="bg-salvia-50 border-b border-black/10 text-left">
                {["Orden", "Paciente", "Factura", "Vence", "Total", "Pagado", "Saldo", ""].map(h => (
                  <th key={h} className="px-3 py-2 font-mono text-[8px] tracking-[0.18em] uppercase text-salvia-700 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {credit.orders.map(o => {
                const late = o.due < today
                const left = daysBetween(today, o.due)
                return (
                  <tr key={o.id} className="border-b border-black/[0.06]">
                    <td className="px-3 py-2 font-mono text-[11px]">
                      {canOpenOrders ? <Link href={`/muestras/${o.id}`} className="text-salvia-700 hover:underline">{o.orderNumber}</Link> : o.orderNumber}
                      <span className="block font-sans text-[10px] text-ink-2">{formatDateTime(o.createdAt)}</span>
                    </td>
                    <td className="px-3 py-2 font-sans text-xs">{o.patientName}</td>
                    <td className="px-3 py-2 font-sans text-xs text-ink-2">
                      {o.invoiceNumber && !o.invoiceNumber.startsWith("EMITIENDO") ? <>{o.invoiceNumber}<span className="block text-[10px]">{fmtDay(o.invoiceDay)}</span></> : "Por facturar"}
                    </td>
                    <td className="px-3 py-2 font-sans text-xs">{fmtDay(o.due)}<span className="block text-[10px] text-ink-2">{o.creditDays} días</span></td>
                    <td className="px-3 py-2 font-sans text-xs">{formatCOP(o.total)}</td>
                    <td className="px-3 py-2 font-sans text-xs">{formatCOP(o.paid)}</td>
                    <td className="px-3 py-2 font-sans text-xs font-medium">{formatCOP(o.balance)}</td>
                    <td className="px-3 py-2">
                      <span className={`font-mono text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 whitespace-nowrap ${late ? "bg-red-100 text-red-800" : left <= 3 ? "bg-amber-100 text-amber-900" : "bg-black/[0.05] text-ink-2"}`}>
                        {late ? `Vencida ${o.daysOverdue} d` : left === 0 ? "Vence hoy" : `En ${left} d`}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mt-8 mb-2">Abonos registrados</h2>
      {payments.length === 0 ? (
        <p className="border border-black/10 bg-white px-4 py-6 text-center font-sans text-sm text-ink-2">Sin abonos.</p>
      ) : (
        <div className="border border-black/10 bg-white divide-y divide-black/[0.06]">
          {payments.map(p => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
              <div>
                <p className="font-sans text-sm font-medium text-ink">{formatCOP(p.amount)} <span className="font-normal text-ink-2">· {methodLabel(p.method)} · {fmtDay(p.date)}</span></p>
                <p className="font-sans text-[11px] text-ink-2">
                  Registró {p.createdByName ?? "—"} · {formatDateTime(p.createdAt)}{p.note ? ` · ${p.note}` : ""}
                </p>
              </div>
              <DeletePaymentButton id={p.id} label={formatCOP(p.amount)} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
