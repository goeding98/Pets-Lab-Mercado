import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { canSeeFinance } from "@/lib/permissions"
import { PERIODS, getFinance, resolvePeriod } from "@/lib/finance"
import { formatCOP } from "@/lib/payment"
import { BarChart, SERIES_1, type Point } from "./Charts"

export const metadata: Metadata = { title: "Finanzas" }
export const dynamic = "force-dynamic"

// Dashboard financiero: solo Michel y Guillermo (lib/permissions.ts: FINANCE_EMAILS; también en middleware)
const SERIES_2 = "#1baf7a" // slot 3 de la paleta validada (aqua): transferencia
const NEUTRAL = "#cfcac0"
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
const fmtDay = (k: string) => `${k.slice(8, 10)}/${k.slice(5, 7)}`
const fmtLong = (k: string) => `${+k.slice(8, 10)} ${MONTHS[+k.slice(5, 7) - 1]} ${k.slice(0, 4)}`
const n0 = (n: number) => Math.round(n).toLocaleString("es-CO")
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—")

function Delta({ cur, prev, invert = false }: { cur: number; prev: number; invert?: boolean }) {
  if (prev === 0 && cur === 0) return <span className="text-ink-2">sin cambio</span>
  if (prev === 0) return <span className="text-ink-2">nuevo vs. período anterior</span>
  const d = ((cur - prev) / prev) * 100
  const good = invert ? d < 0 : d > 0
  const sign = d > 0 ? "▲ +" : d < 0 ? "▼ " : ""
  return (
    <span className={Math.abs(d) < 0.5 ? "text-ink-2" : good ? "text-[#0f7a3d]" : "text-[#b42318]"}>
      {sign}{d.toFixed(Math.abs(d) < 10 ? 1 : 0)}% <span className="text-ink-2">vs. período anterior</span>
    </span>
  )
}

function Kpi({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="bg-white border border-black/[0.08] px-4 py-3.5">
      <p className="font-mono text-[8px] tracking-[0.2em] uppercase text-salvia-700">{label}</p>
      <p className="font-serif text-[26px] leading-tight font-medium tracking-[-0.02em] text-ink mt-1">{value}</p>
      <p className="font-sans text-[11px] mt-1">{children}</p>
    </div>
  )
}

function Card({ title, note, children, className = "" }: { title: string; note?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`bg-white border border-black/[0.08] p-4 md:p-5 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <h2 className="font-sans text-sm font-semibold text-ink">{title}</h2>
        {note && <p className="font-sans text-[11px] text-ink-2">{note}</p>}
      </div>
      {children}
    </section>
  )
}

// Fila con barra horizontal y valor escrito (etiqueta directa)
function BarRow({ label, value, max, right, tag }: { label: string; value: number; max: number; right: string; tag?: string }) {
  return (
    <div className="py-1.5" title={`${label}: ${right}`}>
      <div className="flex justify-between gap-3 font-sans text-xs">
        <span className="text-ink truncate">{label}{tag && <span className="ml-1.5 font-mono text-[7px] tracking-[0.12em] uppercase bg-amber-100 text-amber-900 px-1 py-px align-middle">{tag}</span>}</span>
        <span className="text-ink-2 shrink-0 tabular-nums">{right}</span>
      </div>
      <div className="h-[6px] mt-1 bg-[#f1eee7] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${max > 0 ? Math.max(1, (value / max) * 100) : 0}%`, background: SERIES_1 }} />
      </div>
    </div>
  )
}

export default async function FinanzasPage({ searchParams }: { searchParams: { periodo?: string; desde?: string; hasta?: string } }) {
  const session = await getServerSession(authOptions)
  if (!canSeeFinance(session?.user.role, session?.user.email)) redirect("/dashboard")

  const period = resolvePeriod(searchParams.periodo, searchParams.desde, searchParams.hasta)
  const f = await getFinance(period)
  const { cur, prev } = f

  // Más de 2 meses: por mes; si no, por día
  const monthly = period.days.length > 62
  const buckets = new Map<string, { label: string; long: string; net: number; collected: number; samples: number; processed: number }>()
  for (const d of f.daily) {
    const k = monthly ? d.day.slice(0, 7) : d.day
    const b = buckets.get(k) ?? {
      label: monthly ? `${MONTHS[+d.day.slice(5, 7) - 1]}` : fmtDay(d.day),
      long: monthly ? `${MONTHS[+d.day.slice(5, 7) - 1]} ${d.day.slice(0, 4)}` : fmtLong(d.day),
      net: 0, collected: 0, samples: 0, processed: 0,
    }
    b.net += d.net; b.collected += d.collected; b.samples += d.samples; b.processed += d.processed
    buckets.set(k, b)
  }
  const salesSeries: Point[] = Array.from(buckets.entries()).map(([key, b]) => ({
    key, label: b.label, value: b.net,
    details: [["", b.long], ["Recaudado", formatCOP(b.collected)], ["Muestras", n0(b.samples)]],
  }))
  const processedSeries: Point[] = Array.from(buckets.entries()).map(([key, b]) => ({
    key, label: b.label, value: b.processed,
    details: [["", b.long], ["Muestras recibidas", n0(b.samples)]],
  }))

  const bestDay = f.daily.reduce((a, d) => (d.net > a.net ? d : a), f.daily[0])
  const activeDays = f.daily.filter(d => d.samples > 0).length
  const payTotal = f.payment.cash + f.payment.transfer + f.payment.pending
  const periodLabel = period.from === period.to ? fmtLong(period.from) : `${fmtLong(period.from)} – ${fmtLong(period.to)}`
  const csvHref = `/finanzas/csv?${new URLSearchParams(period.key === "custom" ? { desde: period.from, hasta: period.to } : { periodo: period.key })}`

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Finanzas · solo gerencia</p>
          <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">Desempeño del laboratorio</h1>
          <p className="font-sans text-sm text-ink-2 mt-1">{periodLabel} · {period.days.length} {period.days.length === 1 ? "día" : "días"}</p>
        </div>
        <a href={csvHref} className="border border-black/20 font-mono text-[9px] tracking-[0.18em] uppercase px-4 py-2.5 hover:bg-black/[0.03]">
          Descargar detalle (CSV) ↓
        </a>
      </div>

      {/* Filtros de período en una sola fila */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {PERIODS.map(p => (
          <Link
            key={p.key}
            href={`/finanzas?periodo=${p.key}`}
            className={`font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-2 border ${period.key === p.key ? "bg-salvia-700 text-bone border-salvia-700" : "border-black/15 text-ink hover:bg-black/[0.03]"}`}
          >
            {p.label}
          </Link>
        ))}
        <form method="get" className="flex flex-wrap items-center gap-1.5 ml-auto">
          <input type="date" name="desde" defaultValue={period.from} className="border border-black/20 bg-white px-2 py-1.5 text-xs font-sans" />
          <span className="text-ink-2 text-xs">a</span>
          <input type="date" name="hasta" defaultValue={period.to} className="border border-black/20 bg-white px-2 py-1.5 text-xs font-sans" />
          <button className={`font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-2 border ${period.key === "custom" ? "bg-salvia-700 text-bone border-salvia-700" : "border-black/15"}`}>Aplicar</button>
        </form>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi label="Ventas netas" value={formatCOP(cur.net)}><Delta cur={cur.net} prev={prev.net} /></Kpi>
        <Kpi label="Recaudado" value={formatCOP(cur.collected)}>
          <span className="text-ink-2">{pct(cur.collected, cur.net)} de lo vendido · </span><Delta cur={cur.collected} prev={prev.collected} />
        </Kpi>
        <Kpi label="Por cobrar del período" value={formatCOP(cur.receivable)}>
          <span className="text-ink-2">{pct(cur.receivable, cur.net)} de las ventas</span>
        </Kpi>
        <Kpi label="Ticket promedio por muestra" value={formatCOP(cur.avgTicket)}><Delta cur={cur.avgTicket} prev={prev.avgTicket} /></Kpi>
        <Kpi label="Muestras recibidas" value={n0(cur.samples + f.internal.samples)}>
          <span className="text-ink-2">{n0(cur.samples)} facturables · {n0(f.internal.samples)} Pets &amp; Pets · </span><Delta cur={cur.samples} prev={prev.samples} />
        </Kpi>
        <Kpi label="Exámenes procesados" value={n0(cur.processed)}>
          <span className="text-ink-2">{n0(cur.exams)} solicitados · </span><Delta cur={cur.processed} prev={prev.processed} />
        </Kpi>
        <Kpi label="Tiempo promedio de entrega" value={cur.avgTurnaroundH === null ? "—" : cur.avgTurnaroundH < 48 ? `${cur.avgTurnaroundH.toFixed(1)} h` : `${(cur.avgTurnaroundH / 24).toFixed(1)} días`}>
          {cur.avgTurnaroundH !== null && prev.avgTurnaroundH !== null
            ? <Delta cur={cur.avgTurnaroundH} prev={prev.avgTurnaroundH} invert />
            : <span className="text-ink-2">desde que se registra hasta que se completa</span>}
        </Kpi>
        <Kpi label="Descuentos otorgados" value={formatCOP(cur.discounts)}>
          <span className="text-ink-2">{pct(cur.discounts, cur.gross)} del precio de lista ({formatCOP(cur.gross)})</span>
        </Kpi>
      </div>

      <div className="grid lg:grid-cols-3 gap-3 mb-4">
        <Card title={monthly ? "Ventas netas por mes" : "Ventas netas por día"} note={bestDay && bestDay.net > 0 ? `Mejor día: ${fmtLong(bestDay.day)} (${formatCOP(bestDay.net)}) · ${activeDays} días con ventas` : undefined} className="lg:col-span-2">
          <BarChart data={salesSeries} unit="money" />
        </Card>
        <Card title="Cartera por cobrar" note="Todas las fechas">
          <p className="font-serif text-[30px] font-medium tracking-[-0.02em] text-ink">{formatCOP(f.portfolio)}</p>
          <p className="font-sans text-[11px] text-ink-2 mb-3">Saldo pendiente de todas las muestras (sin Pets &amp; Pets)</p>
          {f.debtors.slice(0, 6).map(d => (
            <BarRow key={d.name} label={d.name} value={d.balance} max={f.debtors[0]?.balance ?? 0} right={`${formatCOP(d.balance)} · ${d.orders} ${d.orders === 1 ? "muestra" : "muestras"}`} />
          ))}
          {f.debtors.length === 0 && <p className="font-sans text-sm text-ink-2">Ninguna clínica tiene saldo pendiente.</p>}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-3 mb-4">
        <Card title={monthly ? "Exámenes procesados por mes" : "Exámenes procesados por día"} note={`${n0(cur.processed)} en el período`} className="lg:col-span-2">
          <BarChart data={processedSeries} unit="count" height={180} />
        </Card>
        <Card title="Cómo se pagó" note="Sobre las ventas del período">
          {payTotal > 0 ? (
            <>
              <div className="flex h-4 rounded-full overflow-hidden gap-[2px] bg-white" role="img" aria-label="Distribución de pagos">
                {[[f.payment.cash, SERIES_1], [f.payment.transfer, SERIES_2], [f.payment.pending, NEUTRAL]].map(([v, c], i) =>
                  (v as number) > 0 ? <div key={i} style={{ width: `${((v as number) / payTotal) * 100}%`, background: c as string }} /> : null)}
              </div>
              <div className="mt-3 space-y-1.5 font-sans text-xs">
                {([["Efectivo", f.payment.cash, SERIES_1], ["Transferencia", f.payment.transfer, SERIES_2], ["Por cobrar", f.payment.pending, NEUTRAL]] as const).map(([l, v, c]) => (
                  <p key={l} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />{l}</span>
                    <span className="tabular-nums text-ink">{formatCOP(v)} <span className="text-ink-2">({pct(v, payTotal)})</span></span>
                  </p>
                ))}
              </div>
            </>
          ) : <p className="font-sans text-sm text-ink-2">Sin ventas en este período.</p>}
          <div className="border-t border-black/[0.06] mt-4 pt-3 font-sans text-xs space-y-1">
            <p className="flex justify-between"><span className="text-ink-2">Solicitadas por Portal Vet</span><span>{n0(f.origin.portal)} ({pct(f.origin.portal, f.origin.portal + f.origin.lab)})</span></p>
            <p className="flex justify-between"><span className="text-ink-2">Registradas en el laboratorio</span><span>{n0(f.origin.lab)}</span></p>
            <p className="flex justify-between"><span className="text-ink-2">Pets &amp; Pets (sin cobro)</span><span>{n0(f.internal.samples)} · {formatCOP(f.internal.value)} de lista</span></p>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-3 mb-4">
        <Card title="Ventas por categoría" note={`${f.areas.length} categorías`}>
          {f.areas.length ? f.areas.map(a => (
            <BarRow key={a.area} label={a.area} value={a.net} max={f.areas[0].net} right={`${formatCOP(a.net)} · ${a.exams} exám. · ${pct(a.net, cur.net)}`} />
          )) : <p className="font-sans text-sm text-ink-2">Sin ventas en este período.</p>}
        </Card>
        <Card title="Exámenes más vendidos" note="Top 12 por ventas">
          {f.exams.length ? f.exams.slice(0, 12).map(x => (
            <BarRow key={x.name} label={x.name} tag={x.custom ? "Personalizado" : undefined} value={x.net} max={f.exams[0].net} right={`${formatCOP(x.net)} · ${x.count}×`} />
          )) : <p className="font-sans text-sm text-ink-2">Sin ventas en este período.</p>}
        </Card>
      </div>

      <Card title="Clínicas" note="Ventas del período por clínica remitente" className="mb-4">
        {f.clinics.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left border-b border-black/10">
                  {["Clínica", "Muestras", "Ventas", "Recaudado", "Saldo", "% de ventas"].map(h => (
                    <th key={h} className={`font-mono text-[8px] tracking-[0.15em] uppercase text-salvia-700 pb-2 pr-3 ${h === "Clínica" ? "" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {f.clinics.map(c => (
                  <tr key={c.name} className="border-b border-black/[0.05]">
                    <td className="py-2 pr-3 font-sans text-ink">{c.name}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{n0(c.samples)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums font-medium">{formatCOP(c.net)}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{formatCOP(c.collected)}</td>
                    <td className={`py-2 pr-3 text-right tabular-nums ${c.net - c.collected > 0 ? "text-[#b42318]" : "text-ink-2"}`}>{formatCOP(Math.max(c.net - c.collected, 0))}</td>
                    <td className="py-2 text-right tabular-nums text-ink-2">{pct(c.net, cur.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="font-sans text-sm text-ink-2">Sin ventas en este período.</p>}
      </Card>

      <Card title="Resultados retenidos por pago" note="Listos, pero la clínica no los ve hasta que pague" className="mb-4">
        {f.held.length ? (
          <div className="divide-y divide-black/[0.05]">
            {f.held.map(h => (
              <p key={h.id} className="py-2 flex flex-wrap justify-between gap-2 font-sans text-xs">
                <Link href={`/muestras/${h.id}`} className="text-salvia-700 hover:underline">{h.orderNumber} · {h.patientName} <span className="text-ink-2">({h.clinic})</span></Link>
                <span className="tabular-nums text-[#b42318]">{formatCOP(h.balance)}</span>
              </p>
            ))}
          </div>
        ) : <p className="font-sans text-sm text-ink-2">Ninguno: todo lo procesado está pagado o liberado.</p>}
      </Card>

      <p className="font-sans text-[11px] text-ink-2 max-w-3xl">
        Cómo se calcula: una venta cuenta el día en que se registra la muestra, con su precio neto de Caja (lista menos descuento).
        Recaudado es lo pagado de esas muestras (el sistema no guarda la fecha de cada pago). Pets &amp; Pets es cliente sin cobro:
        no suma a ventas, se muestra aparte a precio de lista. Exámenes procesados = completados en el período. La comparación es
        contra el período anterior de la misma duración.
      </p>
    </div>
  )
}
