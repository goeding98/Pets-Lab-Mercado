"use client"
import { useState } from "react"

// Gráficos del dashboard financiero (SVG propio, sin librerías). Una serie por gráfico (nunca dos ejes):
// barras finas con punta redondeada, separación de 2px, rejilla tenue y tooltip al pasar el mouse.
// Color de serie: azul validado de la paleta de referencia (skill dataviz, slot 1).

export const SERIES_1 = "#2a78d6"
const GRID = "#e7e3da"
const TEXT_2 = "#5c5b55"

export type Point = { key: string; label: string; value: number; details: [string, string][] }

const niceMax = (v: number) => {
  if (v <= 0) return 1
  const p = 10 ** Math.floor(Math.log10(v)), n = v / p
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p
}

const money = (n: number) => n >= 1e6 ? `$${(n / 1e6).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M` : n >= 1e3 ? `$${Math.round(n / 1e3).toLocaleString("es-CO")} mil` : `$${Math.round(n).toLocaleString("es-CO")}`
const moneyFull = (n: number) => n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
const count = (n: number) => Math.round(n).toLocaleString("es-CO")

export function BarChart({ data, unit, height = 220, emptyText = "Sin datos en este período." }: {
  data: Point[]
  unit: "money" | "count"
  height?: number
  emptyText?: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  if (!data.length || data.every(d => d.value === 0)) {
    return <p className="font-sans text-sm text-ink-2 py-10 text-center">{emptyText}</p>
  }
  const W = 720, H = height, padL = 64, padR = 8, padT = 12, padB = 26
  const max = niceMax(Math.max(...data.map(d => d.value)))
  const plotW = W - padL - padR, plotH = H - padT - padB
  const slot = plotW / data.length
  const barW = Math.max(2, Math.min(28, slot - 2)) // 2px de separación entre barras
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => f * max)
  const labelEvery = Math.ceil(data.length / 12)
  const h = hover !== null ? data[hover] : null
  const axis = unit === "money" ? money : count
  const full = unit === "money" ? moneyFull : count

  return (
    <div className="relative" onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Gráfico de barras">
        {ticks.map(t => {
          const y = padT + plotH - (t / max) * plotH
          return (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke={GRID} strokeWidth={1} />
              <text x={padL - 8} y={y + 3.5} textAnchor="end" fontSize={10} fill={TEXT_2} fontFamily="ui-monospace, monospace">{axis(t)}</text>
            </g>
          )
        })}
        {data.map((d, i) => {
          const bh = (d.value / max) * plotH
          const x = padL + i * slot + (slot - barW) / 2
          const y = padT + plotH - bh
          const r = Math.min(4, barW / 2, bh)
          return (
            <g key={d.key}>
              {/* Zona de hover más grande que la barra */}
              <rect x={padL + i * slot} y={padT} width={slot} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} />
              {bh > 0 && (
                <path
                  d={`M${x},${y + bh} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + barW - r},${y} Q${x + barW},${y} ${x + barW},${y + r} L${x + barW},${y + bh} Z`}
                  fill={SERIES_1}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                  pointerEvents="none"
                />
              )}
              {i % labelEvery === 0 && (
                <text x={padL + i * slot + slot / 2} y={H - 8} textAnchor="middle" fontSize={10} fill={TEXT_2} fontFamily="ui-monospace, monospace">{d.label}</text>
              )}
            </g>
          )
        })}
        <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} stroke="#cfcac0" strokeWidth={1} />
      </svg>
      {h && hover !== null && (
        <div
          className="pointer-events-none absolute top-1 z-10 bg-white border border-black/10 shadow-md px-3 py-2 min-w-[160px]"
          style={{ left: `${Math.min(80, Math.max(2, ((padL + hover * slot + slot / 2) / W) * 100 - 10))}%` }}
        >
          <p className="font-mono text-[10px] text-ink-2">{h.details[0]?.[1] ?? h.label}</p>
          <p className="font-sans text-sm font-semibold text-ink">{full(h.value)}</p>
          {h.details.slice(1).map(([k, v]) => (
            <p key={k} className="font-sans text-[11px] text-ink-2 flex justify-between gap-4"><span>{k}</span><span className="text-ink">{v}</span></p>
          ))}
        </div>
      )}
    </div>
  )
}
