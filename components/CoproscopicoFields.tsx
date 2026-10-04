"use client"
import {
  CRUCES, GRAM, MICROBIOTA, POSITIVO_CRUCES, SANGRE_OCULTA, gramPhrase, phError, type CoproscopicoData,
} from "@/lib/coprologico"
import { FindingsList, HpgList, Markup, Select, heading, input, label } from "./CoproForm"

// Bloques propios del Coproscópico (después del bloque del coprológico, antes de Observaciones):
// "Examen Microscópico" (tabla de 2 columnas) y la tabla "Coproscópico" con Wright / Gram.

function Cell({ title, children, wide = false }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`p-3 min-h-[72px] ${wide ? "sm:col-span-2" : ""}`}>
      <span className={label}>{title}</span>
      {children}
    </div>
  )
}

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
  const grid = "grid grid-cols-1 sm:grid-cols-2 border border-black/10 divide-y divide-black/[0.06] sm:divide-y-0 bg-white [&>*]:border-black/[0.06] sm:[&>*:nth-child(odd)]:border-r sm:[&>*:nth-child(n+3)]:border-t"

  return (
    <>
      {/* Examen Microscópico */}
      <div>
        <p className={heading}>Examen microscópico</p>
        <div className={grid}>
          <Cell title="Microbiota">
            <Select value={value.microbiota} options={MICROBIOTA} onChange={v => set("microbiota", v)} disabled={locked} />
          </Cell>
          <Cell title="Glóbulos rojos">
            <Select value={value.globulosRojos} options={CRUCES} onChange={v => set("globulosRojos", v)} disabled={locked} />
          </Cell>
          <Cell title="Restos alimenticios">
            <Select value={value.restos} options={CRUCES} onChange={v => set("restos", v)} disabled={locked} />
          </Cell>
          <Cell title="Leucocitos">
            <input value={value.leucocitos} onChange={e => set("leucocitos", e.target.value)} disabled={locked} className={input} />
          </Cell>
          <Cell title="Levaduras">
            <Select value={value.levaduras} options={CRUCES} onChange={v => set("levaduras", v)} disabled={locked} />
          </Cell>
          <Cell title="Protozoarios">
            <FindingsList value={value.protozoarios} onChange={v => set("protozoarios", v)} locked={locked} />
          </Cell>
          <Cell title="Otros">
            <input
              value={value.otros}
              onChange={e => set("otros", e.target.value)}
              disabled={locked}
              placeholder="Ej. Estructuras compatibles con *Clostridium sp.* +"
              className={input}
            />
            <p className="font-sans text-[10px] text-ink-2 mt-1">Nombres científicos entre asteriscos para cursiva: *Clostridium sp.*</p>
            {value.otros.includes("*") && <p className="font-sans text-xs text-ink mt-1"><Markup text={value.otros} /></p>}
          </Cell>
          <Cell title="Helmintos">
            <HpgList value={value.helmintos} onChange={v => set("helmintos", v)} locked={locked} />
          </Cell>
        </div>
      </div>

      {/* Coproscópico */}
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
    </>
  )
}
