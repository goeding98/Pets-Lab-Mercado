"use client"
import { useState } from "react"

// Lista de clientes con buscador y casillas (formulario nuevo y edición de clientes)
export default function ClientPicker({
  clinics, selected, onChange,
}: {
  clinics: { id: string; name: string }[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [filter, setFilter] = useState("")
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  const q = norm(filter.trim())
  const visible = q ? clinics.filter(c => norm(c.name).includes(q)) : clinics
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])

  return (
    <div>
      <input
        value={filter}
        onChange={e => setFilter(e.target.value)}
        placeholder="Buscar cliente…"
        className="w-full border border-black/20 bg-white px-3 py-2 text-sm font-sans mb-2 focus:outline-2 focus:outline-salvia-700"
      />
      <div className="max-h-[200px] overflow-y-auto border border-black/[0.08] p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
        {visible.map(c => (
          <label key={c.id} className="flex items-center gap-2.5 cursor-pointer font-sans text-sm">
            <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} className="accent-salvia-700" />
            {c.name}
          </label>
        ))}
        {visible.length === 0 && <p className="font-sans text-xs text-ink-2">Ningún cliente coincide.</p>}
      </div>
    </div>
  )
}
