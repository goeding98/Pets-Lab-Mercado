import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { canSeeBonos } from "@/lib/permissions"
import { monthBonus, thisMonth, validMonth, type BonusStatus } from "@/lib/bonus"
import { BONO_PAQUETE } from "@/lib/routeDay"
import { formatCOP } from "@/lib/payment"
import PayButton from "./PayButton"

export const metadata: Metadata = { title: "Beneficio mensajeros" }
export const dynamic = "force-dynamic"

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
const monthName = (m: string) => `${MESES[Number(m.slice(5)) - 1]} ${m.slice(0, 4)}`
const shift = (m: string, n: number) => {
  const d = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5)) - 1 + n, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}
const fmtDay = (d: string) => d.slice(8, 10) + "/" + d.slice(5, 7)
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit" })
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short" })

const TAG: Record<BonusStatus, [string, string]> = {
  CONFIRMADO: ["Confirmado", "bg-salvia-50 text-salvia-700"],
  POR_CONFIRMAR: ["Por confirmar", "bg-amber-100 text-amber-900"],
  ANULADO: ["Anulado", "bg-red-100 text-red-800"],
}

// Beneficio de los mensajeros por mes: $1.500 por paquete no agendado confirmado (lib/bonus.ts). Michel, Guillermo y Comercial.
export default async function BonusPage({ searchParams }: { searchParams: { mes?: string } }) {
  const session = await getServerSession(authOptions)
  if (!canSeeBonos(session?.user.role, session?.user.email)) redirect("/dashboard")

  const month = validMonth(searchParams.mes)
  const current = thisMonth()
  const rows = await monthBonus(month)
  const total = rows.reduce((n, r) => n + r.amount, 0)
  const pending = rows.reduce((n, r) => n + r.pending, 0)
  const paid = rows.reduce((n, r) => n + (r.payment?.amount ?? 0), 0)

  return (
    <div className="px-4 py-5 md:px-8 md:py-8 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Mensajeros</p>
          <h1 className="font-serif text-[24px] md:text-[28px] font-medium tracking-[-0.02em] mt-1">Beneficio por paquetes</h1>
          <p className="font-sans text-[13px] text-ink-2 mt-1 max-w-2xl">
            {formatCOP(BONO_PAQUETE)} por cada paquete no agendado que registran en el Día a día. Se paga por mes. Un paquete
            se confirma cuando el laboratorio empieza a procesar sus muestras; si se borran, queda anulado.
          </p>
        </div>
        <a href={`/beneficio-mensajeros/csv?mes=${month}`} className="border border-salvia-700 text-salvia-700 font-mono text-[10px] tracking-[0.18em] uppercase px-4 py-2.5 hover:bg-salvia-50">
          Descargar CSV
        </a>
      </div>

      <div className="flex items-center gap-2 mb-5">
        <Link href={`/beneficio-mensajeros?mes=${shift(month, -1)}`} className="border border-black/20 bg-white px-3 py-2 font-sans text-sm hover:border-salvia-700">←</Link>
        <p className="font-sans text-[15px] font-medium capitalize min-w-[150px] text-center">{monthName(month)}</p>
        {month < current ? (
          <Link href={`/beneficio-mensajeros?mes=${shift(month, 1)}`} className="border border-black/20 bg-white px-3 py-2 font-sans text-sm hover:border-salvia-700">→</Link>
        ) : <span className="border border-black/10 px-3 py-2 font-sans text-sm text-ink-2/40">→</span>}
        {month !== current && <Link href="/beneficio-mensajeros" className="font-mono text-[10px] tracking-[0.15em] uppercase underline ml-2">Este mes</Link>}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {([
          ["A pagar (confirmado)", formatCOP(total), ""],
          ["Ya pagado", formatCOP(paid), ""],
          ["Paquetes por confirmar", String(pending), pending > 0 ? "text-amber-800" : ""],
        ] as const).map(([l, v, cls]) => (
          <div key={l} className="border border-black/10 bg-white px-4 py-3">
            <p className="font-mono text-[8px] tracking-[0.18em] uppercase text-ink-2 mb-0.5">{l}</p>
            <p className={`font-sans text-lg md:text-xl font-medium ${cls || "text-ink"}`}>{v}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="border border-black/10 bg-white px-4 py-8 text-center font-sans text-sm text-ink-2">
          Ningún mensajero registró paquetes no agendados en {monthName(month)}.
        </p>
      ) : (
        <div className="space-y-4">
          {rows.map(r => {
            const diff = r.payment ? r.confirmed - r.payment.packages : 0
            return (
              <div key={r.userId} className="border border-black/10 bg-white">
                <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 border-b border-black/10">
                  <div>
                    <p className="font-sans text-[15px] font-medium text-ink">{r.userName}</p>
                    <p className="font-sans text-xs text-ink-2 mt-0.5">
                      {r.confirmed} confirmados · {r.pending} por confirmar{r.annulled ? ` · ${r.annulled} anulados` : ""}
                    </p>
                    {r.payment && (
                      <p className="font-sans text-xs text-salvia-800 mt-1">
                        Pagado {formatCOP(r.payment.amount)} ({r.payment.packages} paquetes) · {fmtDate(r.payment.paidAt)} · {r.payment.paidByName}
                        {diff > 0 && <b className="text-amber-800"> · {diff} confirmados después del pago ({formatCOP(diff * BONO_PAQUETE)})</b>}
                        {diff < 0 && <b className="text-red-700"> · se pagaron {-diff} paquetes que ya no están confirmados</b>}
                      </p>
                    )}
                  </div>
                  <div className="text-right space-y-1.5">
                    <p className="font-sans text-lg font-medium text-ink">{formatCOP(r.amount)}</p>
                    {r.confirmed > 0 && (!r.payment || diff !== 0) && (
                      <PayButton userId={r.userId} month={month} amount={formatCOP(r.amount)} paid={!!r.payment}
                        label={r.payment ? "Actualizar pago" : "Marcar como pagado"} />
                    )}
                    {r.payment && diff === 0 && <PayButton userId={r.userId} month={month} amount={formatCOP(r.amount)} paid label="Pagado ✓" />}
                  </div>
                </div>
                {r.packages.length > 0 && (
                  <details>
                    <summary className="px-4 py-2 font-mono text-[10px] tracking-[0.15em] uppercase text-salvia-700 cursor-pointer">Ver {r.packages.length} paquetes</summary>
                    <div className="overflow-x-auto">
                      <table className="w-full font-sans text-[13px]">
                        <tbody>
                          {r.packages.map(p => (
                            <tr key={p.id} className="border-t border-black/5 align-top">
                              <td className="px-4 py-2 whitespace-nowrap text-ink-2">{fmtDay(p.day)} · {fmtTime(p.at)}</td>
                              <td className="px-2 py-2">{p.name}</td>
                              <td className="px-2 py-2 text-ink-2">
                                {p.orders.length ? p.orders.map(o => `${o.orderNumber} ${o.patientName}`).join(", ") : "Muestras borradas"}
                              </td>
                              <td className="px-4 py-2 text-right whitespace-nowrap">
                                <span className={`font-mono text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 ${TAG[p.status][1]}`}>{TAG[p.status][0]}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
