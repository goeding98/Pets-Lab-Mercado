"use client"
import {
  MORPHO_CHIPS, addPhrase, autoSuggestions, cycleGrade, gradeOf, hasPhrase, togglePhrase,
  type HemoReader, type HemoTextKey,
} from "@/lib/hemogramSuggestions"

// Botones de sugerencias bajo cada casilla de "Morfología y Observaciones" del hemograma (ExamResultForm).
// Verde = calculado con los valores del hemograma; gris = hallazgos del extendido. Tocar agrega/quita la frase;
// los hallazgos con cruces suben + → ++ → +++ → se quitan.
export default function HemoSuggestions({ fieldKey, text, onChange, read, species }: {
  fieldKey: HemoTextKey
  text: string
  onChange: (text: string) => void
  read: HemoReader
  species: string
}) {
  const auto = autoSuggestions(fieldKey, read, species)
  const pending = auto.filter(p => !hasPhrase(text, p))
  const chip = (on: boolean, tone: "auto" | "morpho") =>
    `font-sans text-[10px] px-2 py-0.5 border transition-colors ${
      on
        ? "bg-salvia-700 border-salvia-700 text-bone"
        : tone === "auto"
          ? "border-salvia-700/50 text-salvia-700 bg-salvia-50 hover:bg-salvia-700 hover:text-bone"
          : "border-black/15 text-ink-2 bg-white hover:border-ink hover:text-ink"
    }`

  return (
    <div className="mt-1.5 space-y-1">
      {auto.length > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="font-mono text-[8px] tracking-[0.12em] uppercase text-salvia-700 mr-1">Sugerido</span>
          {auto.map(p => (
            <button key={p} type="button" onClick={() => onChange(togglePhrase(text, p))} className={chip(hasPhrase(text, p), "auto")}>
              {p}
            </button>
          ))}
          {pending.length > 1 && (
            <button type="button" onClick={() => onChange(pending.reduce(addPhrase, text))} className="font-mono text-[8px] tracking-[0.12em] uppercase text-salvia-700 underline ml-1">
              Usar todo
            </button>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1">
        {MORPHO_CHIPS[fieldKey].map(c => {
          if (c.graded) {
            const n = gradeOf(text, c.text)
            return (
              <button key={c.label} type="button" onClick={() => onChange(cycleGrade(text, c.text))} className={chip(n > 0, "morpho")} title="Cada clic: + → ++ → +++ → quitar">
                {c.label}{n > 0 ? ` ${"+".repeat(n)}` : ""}
              </button>
            )
          }
          const on = hasPhrase(text, c.text)
          return (
            <button
              key={c.label}
              type="button"
              className={chip(on, "morpho")}
              onClick={() => {
                if (c.askPercent && !on) {
                  const pct = window.prompt("¿Qué porcentaje?")?.trim().replace(/%$/, "")
                  if (!pct) return
                  return onChange(addPhrase(text, `${c.text} ${pct}%`))
                }
                onChange(togglePhrase(text, c.text))
              }}
            >
              {c.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
