"use client"
import { useState, useTransition } from "react"
import { createPromotion } from "@/actions/promotions"

type Template = { id: string; name: string; area: string; turnaround: string; sampleType: string }

export default function NewPromotionForm({ templates }: { templates: Template[] }) {
  const [name, setName] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [filter, setFilter] = useState("")
  const [error, setError] = useState("")
  const [done, setDone] = useState("")
  const [pending, startTransition] = useTransition()

  function toggle(id: string) {
    setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setDone("")
    startTransition(async () => {
      const res = await createPromotion(name, selected)
      if (res.error) {
        setError(res.error)
      } else {
        setDone(`Promoción “${name.trim()}” creada.`)
        setName("")
        setSelected([])
      }
    })
  }

  const q = filter.trim().toLowerCase()
  const visible = q ? templates.filter(t => t.name.toLowerCase().includes(q)) : templates
  const areas = Array.from(new Set(visible.map(t => t.area)))
  const byId = new Map(templates.map(t => [t.id, t]))

  return (
    <form onSubmit={handleSubmit} className="border border-black/10 p-5 space-y-5 bg-white">
      <div>
        <Label>Nombre de la promoción *</Label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          required
          placeholder="Ej. Perfil mixto"
          className={inputClass}
        />
      </div>

      <div>
        <Label>Exámenes incluidos * <span className="text-ink-2">({selected.length} seleccionados)</span></Label>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {selected.map(id => (
              <button
                key={id}
                type="button"
                onClick={() => toggle(id)}
                className="font-sans text-xs bg-salvia-700 text-bone px-2.5 py-1 hover:bg-salvia-800"
                title="Quitar"
              >
                {byId.get(id)?.name} ×
              </button>
            ))}
          </div>
        )}
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Buscar examen…"
          className={`${inputClass} mb-3`}
        />
        <div className="max-h-[420px] overflow-y-auto border border-black/[0.08] p-3 space-y-4">
          {areas.map(area => (
            <div key={area}>
              <p className="font-mono text-[8px] tracking-[0.18em] text-ink-2 uppercase mb-2">{area}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {visible.filter(t => t.area === area).map(t => (
                  <label key={t.id} className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.includes(t.id)}
                      onChange={() => toggle(t.id)}
                      className="mt-0.5 accent-salvia-700"
                    />
                    <span className="font-sans text-sm">
                      {t.name}
                      <span className="block font-mono text-[8px] tracking-[0.1em] text-ink-2">{t.turnaround} · {t.sampleType}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          {areas.length === 0 && <p className="font-sans text-xs text-ink-2">Ningún examen coincide.</p>}
        </div>
      </div>

      {error && <p className="font-mono text-[9px] tracking-[0.15em] text-red-600 uppercase">{error}</p>}
      {done && <p className="font-mono text-[9px] tracking-[0.15em] text-salvia-700 uppercase">{done}</p>}

      <button
        type="submit"
        disabled={pending || !name.trim() || selected.length < 2}
        className="bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.22em] uppercase px-6 py-3 hover:bg-salvia-800 transition-colors disabled:opacity-50"
      >
        {pending ? "Creando…" : "Crear promoción →"}
      </button>
    </form>
  )
}

const inputClass =
  "w-full border border-black/20 bg-white px-3 py-2 text-sm font-sans focus:outline-2 focus:outline-salvia-700 focus:outline-offset-0"

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-mono text-[9px] tracking-[0.18em] uppercase text-salvia-700 mb-1.5">
      {children}
    </label>
  )
}
