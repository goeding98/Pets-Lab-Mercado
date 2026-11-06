import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { PROGRAM_START, TIERS, getLoyaltyStatuses, getPeriodResult, periodOf, prevPeriod, type Tier } from "@/lib/loyalty"
import { toWhatsAppNumber } from "@/lib/whatsapp"

export const metadata: Metadata = { title: "Club Pets & Lab" }
export const dynamic = "force-dynamic"

const fmt = (d: string) => d.slice(8) + "/" + d.slice(5, 7)

function TierTag({ tier }: { tier: Tier | null }) {
  if (!tier) return <span className="font-mono text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 bg-black/[0.05] text-ink-2">Sin nivel</span>
  return (
    <span className="font-mono text-[8px] tracking-[0.15em] uppercase px-2 py-0.5" style={{ background: tier.soft, color: tier.color }}>
      {tier.name} · {tier.percent}%
    </span>
  )
}

// Dashboard del programa de lealtad (permiso "descuentos": ADMIN y COMERCIAL). Lógica en lib/loyalty.ts.
export default async function LealtadPage() {
  const statuses = await getLoyaltyStatuses() // también cierra los cortes pendientes
  const clinics = await prisma.clinic.findMany({ where: { noCharge: false }, select: { id: true, name: true, phone: true } })
  const info = new Map(clinics.map(c => [c.id, c]))
  const rows = Array.from(statuses.values())
    .map(s => ({ ...s, name: info.get(s.clinicId)?.name ?? "—", phone: info.get(s.clinicId)?.phone ?? null }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  const period = periodOf()
  const any = rows[0]
  const close = rows.filter(r => r.count > 0 && r.next && r.missing <= 3)
  const total = rows.reduce((n, r) => n + r.count, 0)
  const active = rows.filter(r => r.active).length

  // Historial de cortes cerrados (desde el inicio del programa)
  const history: { id: string; label: string; byTier: Record<string, number>; at: string }[] = []
  for (let p = prevPeriod(period), i = 0; i < 6 && p.id.localeCompare(PROGRAM_START, undefined, { numeric: true }) >= 0; p = prevPeriod(p), i++) {
    const r = await getPeriodResult(p.id)
    if (!r) continue
    const byTier: Record<string, number> = {}
    for (const x of r.results) if (x.tier) byTier[x.tier] = (byTier[x.tier] ?? 0) + 1
    history.push({ id: p.id, label: p.label, byTier, at: r.at })
  }

  return (
    <div className="px-4 py-5 md:px-8 md:py-8 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Programa de lealtad</p>
          <h1 className="font-serif text-[24px] md:text-[28px] font-medium tracking-[-0.02em] mt-1">Club Pets &amp; Lab</h1>
          <p className="font-sans text-[13px] text-ink-2 mt-1 max-w-2xl">
            Corte actual <strong>{period.label}</strong>{any ? <> · cierra en {any.daysLeft} {any.daysLeft === 1 ? "día" : "días"} · el nivel que alcancen da descuento del {fmt(any.reward.start)} al {fmt(any.reward.end)}</> : null}.
            Cuentan pacientes distintos, no exámenes. Los descuentos se crean solos al cerrar el corte y aparecen en{" "}
            <Link href="/descuentos?tipo=auto" className="text-salvia-700 underline">Descuentos</Link>.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {TIERS.slice().reverse().map(t => (
          <div key={t.key} className="border border-black/10 px-4 py-3" style={{ background: t.soft }}>
            <p className="font-mono text-[8px] tracking-[0.18em] uppercase" style={{ color: t.color }}>{t.name} hoy · {t.percent}%</p>
            <p className="font-serif text-[28px] leading-tight font-medium" style={{ color: t.color }}>{rows.filter(r => r.tier?.key === t.key).length}</p>
            <p className="font-sans text-[11px] text-ink-2">clínicas ({t.min}{t.key === "ORO" ? "+" : `–${TIERS[TIERS.indexOf(t) + 1].min - 1}`} pacientes)</p>
          </div>
        ))}
        <div className="border border-black/10 bg-white px-4 py-3">
          <p className="font-mono text-[8px] tracking-[0.18em] uppercase text-ink-2">Pacientes en el corte</p>
          <p className="font-serif text-[28px] leading-tight font-medium text-ink">{total}</p>
          <p className="font-sans text-[11px] text-ink-2">{active} con descuento de lealtad activo</p>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-1">🔥 A punto de subir de nivel</h2>
        <p className="font-sans text-[12px] text-ink-2 mb-3">Les faltan 1 a 3 pacientes. Un mensaje del comercial puede hacer la diferencia antes del cierre.</p>
        {close.length === 0 ? (
          <p className="border border-black/10 bg-white px-4 py-5 text-center font-sans text-sm text-ink-2">Nadie está a 3 pacientes o menos del siguiente nivel.</p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2.5">
            {close.map(r => {
              const wa = toWhatsAppNumber(r.phone)
              const text = `Hola, ${r.name}. En Pets & Lab llevan ${r.count} pacientes en esta quincena: con ${r.missing} más suben a nivel ${r.next!.name} y tienen ${r.next!.percent}% de descuento durante un mes. El corte cierra el ${fmt(r.period.end)}.`
              return (
                <div key={r.clinicId} className="border border-amber-300 bg-amber-50/60 px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-sans text-[14px] font-medium text-ink">{r.name}</p>
                    <TierTag tier={r.tier} />
                  </div>
                  <p className="font-sans text-[12px] text-ink mt-1">
                    {r.count} pacientes · faltan <strong>{r.missing}</strong> para {r.next!.name} ({r.next!.percent}%)
                  </p>
                  {wa && (
                    <a href={`https://wa.me/${wa}?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"
                      className="inline-block mt-2 font-mono text-[9px] tracking-[0.15em] uppercase bg-[#1f8f4e] text-white px-3 py-1.5">
                      Escribir por WhatsApp
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-3">Ranking del corte {period.label}</h2>
        <div className="border border-black/10 bg-white divide-y divide-black/[0.06]">
          {rows.map((r, i) => (
            <div key={r.clinicId} className="px-4 py-3 grid grid-cols-[auto_1fr] md:grid-cols-[2rem_2fr_1.3fr_1.5fr_1.5fr] gap-x-3 gap-y-1 items-center">
              <span className="font-mono text-[11px] text-ink-2 w-6">{i + 1}</span>
              <div className="min-w-0">
                <p className="font-sans text-[14px] font-medium text-ink truncate">{r.name}</p>
                <div className="mt-1 h-1.5 bg-black/[0.06] rounded-full overflow-hidden max-w-[220px]">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(r.count / 30, 1) * 100}%`, background: r.tier?.color ?? "#2f5d50" }} />
                </div>
              </div>
              <div className="col-start-2 md:col-start-auto flex items-center gap-2">
                <span className="font-serif text-[20px] font-medium text-ink">{r.count}</span>
                <TierTag tier={r.tier} />
              </div>
              <p className="col-start-2 md:col-start-auto font-sans text-[12px] text-ink-2">
                {r.next ? <>Faltan {r.missing} para {r.next.name}</> : "Nivel máximo"}
                {r.projected > r.count && <span className="block">Proyección: ~{r.projected}</span>}
              </p>
              <p className="col-start-2 md:col-start-auto font-sans text-[12px] text-ink-2">
                {r.active ? <span className="text-salvia-700 font-medium">{r.active.percent}% activo hasta {fmt(r.active.end)}</span> : "Sin descuento activo"}
                {r.last && r.last.count > 0 && <span className="block">Corte ant.: {r.last.count}{r.last.tier ? ` · ${r.last.tier.name}` : ""}</span>}
              </p>
            </div>
          ))}
          {rows.length === 0 && <p className="px-4 py-6 text-center font-sans text-sm text-ink-2">No hay clientes.</p>}
        </div>
      </section>

      <section>
        <h2 className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-3">Cortes cerrados</h2>
        {history.length === 0 ? (
          <p className="border border-black/10 bg-white px-4 py-5 font-sans text-sm text-ink-2">
            El programa empezó con el corte del 1–15 nov. El primer cierre es el 16/11 a las 12 am: ese día se crean solos los descuentos.
          </p>
        ) : (
          <div className="border border-black/10 bg-white divide-y divide-black/[0.06]">
            {history.map(h => (
              <div key={h.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
                <p className="font-sans text-[14px] font-medium text-ink w-32">{h.label}</p>
                {TIERS.slice().reverse().filter(t => h.byTier[t.key]).map(t => (
                  <span key={t.key} className="font-mono text-[8px] tracking-[0.15em] uppercase px-2 py-0.5" style={{ background: t.soft, color: t.color }}>
                    {h.byTier[t.key]} {t.name}
                  </span>
                ))}
                {Object.keys(h.byTier).length === 0 && <span className="font-sans text-[12px] text-ink-2">Nadie alcanzó nivel</span>}
                <Link href="/descuentos?tipo=auto" className="ml-auto font-mono text-[9px] tracking-[0.15em] uppercase text-salvia-700 hover:underline">Ver descuentos →</Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
