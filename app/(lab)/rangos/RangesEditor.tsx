"use client"
import { useMemo, useState, useTransition } from "react"
import { updateFieldRanges } from "@/actions/ranges"

export type RangeField = {
  id: string
  name: string
  unit: string | null
  refCanine: string | null
  refFeline: string | null
  copies: number
  editedIn: string | null // si es copia: examen maestro donde se edita
}

export type MasterExam = {
  id: string
  name: string
  area: string
  sections: { name: string; fields: RangeField[] }[]
}

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")

function FieldRow({ field }: { field: RangeField }) {
  const [canine, setCanine] = useState(field.refCanine ?? "")
  const [feline, setFeline] = useState(field.refFeline ?? "")
  const [saved, setSaved] = useState({ canine: field.refCanine ?? "", feline: field.refFeline ?? "" })
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const dirty = canine !== saved.canine || feline !== saved.feline
  const readOnly = field.editedIn !== null

  function save() {
    setMessage(null)
    startTransition(async () => {
      try {
        const res = await updateFieldRanges(field.id, canine, feline)
        if (res.error) return setMessage({ ok: false, text: res.error })
        setSaved({ canine, feline })
        setMessage({ ok: true, text: res.copies ? `Guardado · también en ${res.copies} ${res.copies === 1 ? "copia" : "copias"}` : "Guardado" })
      } catch {
        setMessage({ ok: false, text: "No se pudo guardar. Recarga e intenta de nuevo." })
      }
    })
  }

  const input = "border border-black/20 bg-white px-2 py-1 text-xs font-mono w-full focus:outline-salvia-700 disabled:bg-black/5 disabled:text-ink-2"

  return (
    <tr className="border-t border-black/[0.05] align-top">
      <td className="py-2 pr-3 font-sans text-xs text-ink">
        {field.name}
        {field.unit && <span className="font-mono text-[10px] text-ink-2 ml-1.5">{field.unit}</span>}
        {!readOnly && field.copies > 0 && (
          <span className="block font-mono text-[8px] tracking-[0.12em] uppercase text-salvia-700 mt-0.5">
            Se aplica también en {field.copies} {field.copies === 1 ? "copia" : "copias"}
          </span>
        )}
        {readOnly && (
          <span className="block font-mono text-[8px] tracking-[0.12em] uppercase text-ink-2 mt-0.5">
            Se edita en {field.editedIn}
          </span>
        )}
      </td>
      <td className="py-2 pr-3 w-[200px]">
        <input value={canine} onChange={e => { setCanine(e.target.value); setMessage(null) }} disabled={readOnly} placeholder="—" className={input} />
      </td>
      <td className="py-2 pr-3 w-[200px]">
        <input value={feline} onChange={e => { setFeline(e.target.value); setMessage(null) }} disabled={readOnly} placeholder="—" className={input} />
      </td>
      <td className="py-2 w-[150px]">
        {!readOnly && (
          <button
            type="button"
            onClick={save}
            disabled={!dirty || pending}
            className="bg-salvia-700 text-bone font-mono text-[9px] tracking-[0.18em] uppercase px-3 py-1.5 hover:bg-salvia-800 transition-colors disabled:opacity-30"
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
        )}
        {message && (
          <p className={`font-sans text-[11px] mt-1 ${message.ok ? "text-salvia-700" : "text-red-600"}`}>{message.text}</p>
        )}
      </td>
    </tr>
  )
}

export default function RangesEditor({ exams }: { exams: MasterExam[] }) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const q = normalize(query.trim())
    if (!q) return exams
    return exams
      .map(e => normalize(e.name).includes(q)
        ? e
        : { ...e, sections: e.sections.map(s => ({ ...s, fields: s.fields.filter(f => normalize(f.name).includes(q)) })).filter(s => s.fields.length) })
      .filter(e => e.sections.length > 0)
  }, [exams, query])

  const areas = Array.from(new Set(filtered.map(e => e.area)))

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Buscar examen o parámetro (ej. hemograma, creatinina, reticulocitos)…"
        className="border border-black/20 bg-white px-3 py-2 text-sm font-sans w-full max-w-xl mb-6 focus:outline-salvia-700"
      />

      {areas.length === 0 && <p className="font-sans text-sm text-ink-2">No hay exámenes que coincidan.</p>}

      {areas.map(area => (
        <section key={area} className="mb-8">
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-3">{area}</p>
          <div className="space-y-2">
            {filtered.filter(e => e.area === area).map(exam => (
              <details key={exam.id} open={query.trim() !== ""} className="border border-black/10 bg-white group">
                <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
                  <span className="font-sans text-sm font-medium text-ink">{exam.name}</span>
                  <span className="font-mono text-[8px] tracking-[0.15em] uppercase text-ink-2 group-open:hidden">
                    {exam.sections.reduce((n, s) => n + s.fields.length, 0)} parámetros ›
                  </span>
                </summary>
                <div className="px-4 pb-4">
                  {exam.sections.map(section => (
                    <div key={section.name} className="mt-2">
                      {exam.sections.length > 1 && (
                        <p className="font-mono text-[8px] tracking-[0.2em] text-ink-2 uppercase mb-1 border-b border-black/[0.06] pb-1">
                          {section.name}
                        </p>
                      )}
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left">
                            <th className="font-mono text-[8px] tracking-[0.15em] text-salvia-700 uppercase pb-1 pr-3">Parámetro</th>
                            <th className="font-mono text-[8px] tracking-[0.15em] text-salvia-700 uppercase pb-1 pr-3">Ref. canino</th>
                            <th className="font-mono text-[8px] tracking-[0.15em] text-salvia-700 uppercase pb-1 pr-3">Ref. felino</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {section.fields.map(f => <FieldRow key={f.id} field={f} />)}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
