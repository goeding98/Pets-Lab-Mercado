"use client"
import {
  CRUCES, GRAM, POSITIVO_CRUCES, SANGRE_OCULTA, gramPhrase, phError, type CoproscopicoData,
} from "@/lib/coprologico"
import { Cell, Markup, Select, grid, heading, input, label } from "./CoproForm"

// Tabla propia del Coproscópico (pH, almidones, grasa, sangre oculta, Wright / Gram). Va después
// del Examen microscópico del bloque del coprológico; el Coprológico no la lleva.

export default function CoproscopicoFields({
  value, onChange, locked,
}: {
  value: CoproscopicoData
  onChange: (v: CoproscopicoData) => void
  locked: boolean
}) {
  const set = <K extends keyof CoproscopicoData>(k: K, v: CoproscopicoData[K]) => onChange({ ...value, [k]: v })
  const ph = phError(value.ph)
  const phrase = gramPhrase(value)

  return (
    <div>
      <p className={heading}>Coproscópico</p>
      <div className={grid}>
        <Cell title="pH">
          <input
            type="number"
            step="0.1"
            min={4}
            max={9}
            value={value.ph}
            onChange={e => set("ph", e.target.value)}
            disabled={locked}
            placeholder="4.0 – 9.0"
            className={`${input} ${ph ? "border-red-400" : ""}`}
          />
          {ph && <p className="font-sans text-[11px] text-red-600 mt-1">{ph}</p>}
        </Cell>
        <Cell title="Almidones">
          <Select value={value.almidones} options={POSITIVO_CRUCES} onChange={v => set("almidones", v)} disabled={locked} />
        </Cell>
        <Cell title="Grasa fecal">
          <Select value={value.grasa} options={POSITIVO_CRUCES} onChange={v => set("grasa", v)} disabled={locked} />
        </Cell>
        <Cell title="Sangre oculta">
          <Select value={value.sangreOculta} options={SANGRE_OCULTA} onChange={v => set("sangreOculta", v)} disabled={locked} />
          {value.sangreOculta === "Positivo" && <p className="font-sans text-xs font-bold text-ink mt-1">Positivo (sale en negrita en el PDF)</p>}
        </Cell>
        <Cell title="Tinción Wright / Gram" wide>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
            {GRAM.map(g => (
              <div key={g.key} className="flex items-center justify-between gap-3">
                <span className="font-sans text-xs text-ink">{g.label}</span>
                <select
                  value={value.gram[g.key]}
                  onChange={e => set("gram", { ...value.gram, [g.key]: e.target.value })}
                  disabled={locked}
                  className={`${input} w-28`}
                >
                  {CRUCES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            ))}
          </div>
          <span className={`${label} mt-3`}>Otros hallazgos</span>
          <input value={value.gramOtros} onChange={e => set("gramOtros", e.target.value)} disabled={locked} className={input} />
          <p className="font-sans text-xs text-ink mt-2 bg-salvia-50/50 border border-black/[0.05] px-3 py-2">
            <span className="block font-mono text-[8px] tracking-[0.15em] uppercase text-ink-2 mb-1">Así sale en el PDF</span>
            {phrase || value.gramOtros.trim() ? <Markup text={[phrase, value.gramOtros.trim()].filter(Boolean).join(" ")} /> : "No se observan bacterias."}
          </p>
        </Cell>
      </div>
    </div>
  )
}
