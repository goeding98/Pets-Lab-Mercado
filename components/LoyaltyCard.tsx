import { TIERS, loyaltyMessage, monthName, tierFor, type LoyaltyStatus, type Tier } from "@/lib/loyalty"

const SCALE = 30 // la barra llega hasta 30 pacientes (Oro empieza en 26)
const fmt = (d: string) => d.slice(8) + "/" + d.slice(5, 7)

function Medal({ tier, size = 28 }: { tier: Tier | null; size?: number }) {
  const c = tier?.color ?? "#b9c2bc"
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M10 2h5l-3 9H7zM17 2h5l3 9h-5z" fill={c} opacity=".55" />
      <circle cx="16" cy="20" r="10" fill={c} />
      <circle cx="16" cy="20" r="7" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="1.2" />
      <path d="M16 15.5l1.4 2.9 3.1.4-2.3 2.2.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.2 3.1-.4z" fill="#fff" fillOpacity=".9" />
    </svg>
  )
}

// Barra de progreso del Club Pets & Lab (Portal Vet). compact = versión corta para "Nueva solicitud".
export default function LoyaltyCard({ s, compact = false, leaders = 0 }: { s: LoyaltyStatus; compact?: boolean; leaders?: number }) {
  const msg = loyaltyMessage(s)
  const pct = Math.min(s.count / SCALE, 1) * 100
  const projectedTier = tierFor(s.projected)
  const accent = s.best?.color ?? s.tier?.color ?? "#2f5d50"
  const mes = monthName(s.reward.month)

  const bar = (
    <div className="relative pt-1 pb-6">
      <div className="h-3 rounded-full bg-black/[0.07] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, s.count > 0 ? 3 : 0)}%`, background: `linear-gradient(90deg, #2f5d50, ${accent})` }} />
      </div>
      {TIERS.map(t => {
        const reached = s.count >= t.min
        return (
          <div key={t.key} className="absolute top-0 -translate-x-1/2 flex flex-col items-center" style={{ left: `${(t.min / SCALE) * 100}%` }}>
            <span className="w-1 h-5 rounded-full" style={{ background: reached ? t.color : "#00000026" }} />
            <span className="mt-0.5 font-mono text-[8px] tracking-[0.12em] uppercase whitespace-nowrap" style={{ color: reached ? t.color : "#6b726e" }}>
              {t.name} · {t.min}
            </span>
          </div>
        )
      })}
    </div>
  )

  if (compact) {
    return (
      <div className="border border-black/10 bg-white px-4 py-3 mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Medal tier={s.best} size={24} />
          <p className="font-sans text-[13px] text-ink flex-1"><strong>{msg.title}</strong> <span className="text-ink-2">{msg.body}</span></p>
        </div>
        {bar}
      </div>
    )
  }

  return (
    <section className="border border-black/10 bg-white mb-8 overflow-hidden">
      <div className="px-5 pt-4 pb-2" style={{ background: `linear-gradient(135deg, ${s.best?.soft ?? "#eef3f0"} 0%, #ffffff 70%)` }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Medal tier={s.best} size={40} />
            <div>
              <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Club Pets &amp; Lab</p>
              <p className="font-serif text-[22px] font-medium leading-tight" style={{ color: s.best?.color ?? "#1f2a24" }}>
                {s.best ? `Nivel ${s.best.name}` : "Sin nivel aún"}
              </p>
              <p className="font-sans text-[12px] text-ink-2">{s.best ? `${s.best.percent}% asegurado para todo ${mes}` : `Descuento de ${mes} por desbloquear`}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-[8px] tracking-[0.18em] uppercase text-ink-2">Oportunidad {s.half} de 2 · corte {s.period.label}</p>
            <p className="font-sans text-[13px] text-ink">
              {s.daysLeft <= 1 ? <strong className="text-red-700">¡Cierra hoy!</strong> : <>Cierra en <strong>{s.daysLeft} días</strong></>}
            </p>
          </div>
        </div>

        <div className="flex items-end gap-3 mt-4">
          <p className="font-serif text-[44px] leading-none font-medium text-ink">{s.count}</p>
          <p className="font-sans text-[13px] text-ink-2 pb-1">{s.count === 1 ? "paciente" : "pacientes"} en esta quincena</p>
        </div>
        {s.secured && (
          <p className="inline-block mt-3 font-sans text-[12px] px-2.5 py-1" style={{ background: s.secured.tier.soft, color: s.secured.tier.color }}>
            ✓ Corte {s.secured.period.label}: {s.secured.tier.name} con {s.secured.count} pacientes, ya asegurado
          </p>
        )}
        <p className="font-sans text-[15px] font-medium text-ink mt-3">{msg.title}</p>
        <p className="font-sans text-[13px] text-ink-2">{msg.body}</p>

        <div className="mt-4">{bar}</div>
      </div>

      <div className="grid grid-cols-3 border-t border-black/[0.06]">
        {TIERS.map((t, i) => {
          const reached = (s.best?.percent ?? 0) >= t.percent
          const range = TIERS[i + 1] ? `${t.min}–${TIERS[i + 1].min - 1}` : `${t.min}+`
          return (
            <div key={t.key} className={`px-3 py-3 text-center ${i > 0 ? "border-l border-black/[0.06]" : ""}`} style={{ background: reached ? t.soft : undefined }}>
              <p className="font-mono text-[8px] tracking-[0.18em] uppercase" style={{ color: t.color }}>{reached ? "✓ " : "🔒 "}{t.name}</p>
              <p className="font-serif text-[24px] leading-tight font-medium" style={{ color: reached ? t.color : "#9aa39e" }}>{t.percent}%</p>
              <p className="font-sans text-[11px] text-ink-2">{range} pacientes</p>
            </div>
          )
        })}
      </div>

      <div className="px-5 py-3 border-t border-black/[0.06] space-y-1.5 font-sans text-[12px] text-ink">
        {s.active && (
          <p>🎁 <strong>Hoy tienes {s.active.percent}% de descuento</strong>{s.active.tier ? ` (nivel ${s.active.tier.name})` : ""} en todos tus exámenes, hasta el {fmt(s.active.end)}.</p>
        )}
        {s.upcoming && (
          <p>📅 Ya ganaste <strong>{s.upcoming.percent}%</strong> del {fmt(s.upcoming.start)} al {fmt(s.upcoming.end)}.</p>
        )}
        {s.projected > s.count && projectedTier && projectedTier.percent > (s.best?.percent ?? 0) && (
          <p>📈 A tu ritmo cerrarías con unos <strong>{s.projected} pacientes</strong>: nivel {projectedTier.name} ({projectedTier.percent}%).</p>
        )}
        {s.last && s.last.count > 0 && (
          <p className="text-ink-2">Corte anterior ({s.last.period.label}): {s.last.count} pacientes{s.last.tier ? ` · nivel ${s.last.tier.name}` : ""}.</p>
        )}
        {leaders > 0 && <p className="text-ink-2">👏 {leaders} {leaders === 1 ? "clínica ganó" : "clínicas ganaron"} nivel en el último corte.</p>}
        <p className="text-[11px] text-ink-2 pt-1">
          Cada mes tienes dos oportunidades: del 1 al 15 y del 16 a fin de mes. Cuentan los pacientes distintos de cada quincena (no los
          exámenes), y el mejor nivel que alcances en cualquiera de las dos te da el descuento durante todo el mes siguiente. Las
          solicitudes cuentan cuando el laboratorio recibe la muestra.
        </p>
      </div>
    </section>
  )
}
