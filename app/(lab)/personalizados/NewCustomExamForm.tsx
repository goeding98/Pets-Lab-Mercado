"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createCustomExam, updateCustomExam } from "@/actions/customExams"
import { formatCOP } from "@/lib/payment"
import ClientPicker from "./ClientPicker"

type Template = { id: string; name: string; area: string; turnaround: string; sampleType: string; price: number | null }
const OTRA = "__otra__"

// Con "edit" es el formulario de Editar de un personalizado ya creado (mismos campos, ya llenos)
export type CustomExamEdit = { id: string; name: string; area: string; clinicIds: string[]; templateIds: string[]; price: number | null; used: boolean }

export default function NewCustomExamForm({
  templates, clinics, areas, edit, onClose,
}: {
  templates: Template[]
  clinics: { id: string; name: string }[]
  areas: string[]
  edit?: CustomExamEdit
  onClose?: () => void
}) {
  const router = useRouter()
  const [name, setName] = useState(edit?.name ?? "")
  const [area, setArea] = useState(edit ? (areas.includes(edit.area) ? edit.area : OTRA) : "Perfiles")
  const [areaOtra, setAreaOtra] = useState(edit && !areas.includes(edit.area) ? edit.area : "")
  const [clinicIds, setClinicIds] = useState<string[]>(edit?.clinicIds ?? [])
  const [selected, setSelected] = useState<string[]>(edit?.templateIds ?? [])
  const [price, setPrice] = useState(edit?.price != null ? String(edit.price) : "")
  const [filter, setFilter] = useState("")
  const [error, setError] = useState("")
  const [done, setDone] = useState("")
  const [pending, startTransition] = useTransition()

  const toggle = (id: string) => setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))
  const byId = new Map(templates.map(t => [t.id, t]))
  const listTotal = selected.reduce((n, id) => n + (byId.get(id)?.price ?? 0), 0)
  const finalArea = area === OTRA ? areaOtra.trim() : area

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setDone("")
    startTransition(async () => {
      const input = { name, area: finalArea, clinicIds, templateIds: selected, price: Number(price) }
      if (edit) {
        const res = await updateCustomExam(edit.id, input)
        if (res.error) return setError(res.error)
        if (res.newVersion) alert("Como este examen ya tenía órdenes, se creó una versión nueva con los exámenes elegidos. Las órdenes anteriores quedan con la versión de antes.")
        router.refresh()
        return onClose?.()
      }
      const res = await createCustomExam(input)
      if (res.error) return setError(res.error)
      setDone(`“${name.trim()}” creado.`)
      setName(""); setPrice(""); setSelected([]); setClinicIds([])
      router.refresh()
    })
  }

  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  const q = norm(filter.trim())
  const visible = q ? templates.filter(t => norm(t.name).includes(q)) : templates
  const groups = Array.from(new Set(visible.map(t => t.area)))

  return (
    <form onSubmit={handleSubmit} className="border border-black/10 p-5 space-y-5 bg-white">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_160px] gap-4">
        <div>
          <Label>Nombre *</Label>
          <input value={name} onChange={e => setName(e.target.value)} required placeholder="Ej. Perfil Dr. Diego García" className={inputClass} />
        </div>
        <div>
          <Label>Categoría *</Label>
          <select value={area} onChange={e => setArea(e.target.value)} className={inputClass}>
            {areas.map(a => <option key={a}>{a}</option>)}
            <option value={OTRA}>Otra…</option>
          </select>
          {area === OTRA && (
            <input value={areaOtra} onChange={e => setAreaOtra(e.target.value)} placeholder="Nombre de la categoría" className={`${inputClass} mt-1.5`} />
          )}
        </div>
        <div>
          <Label>Precio (COP) *</Label>
          <input type="number" min={1} step={100} value={price} onChange={e => setPrice(e.target.value)} required placeholder="Ej. 35000" className={inputClass} />
        </div>
      </div>

      <div>
        <Label>Clientes que lo ven * <span className="text-ink-2">({clinicIds.length} elegidos)</span></Label>
        <ClientPicker clinics={clinics} selected={clinicIds} onChange={setClinicIds} />
      </div>

      <div>
        <Label>Exámenes incluidos * <span className="text-ink-2">({selected.length} · por separado sumarían {formatCOP(listTotal)})</span></Label>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {selected.map(id => (
              <button key={id} type="button" onClick={() => toggle(id)} title="Quitar"
                className="font-sans text-xs bg-salvia-700 text-bone px-2.5 py-1 hover:bg-salvia-800">
                {byId.get(id)?.name} ×
              </button>
            ))}
          </div>
        )}
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Buscar examen…" className={`${inputClass} mb-3`} />
        <div className="max-h-[420px] overflow-y-auto border border-black/[0.08] p-3 space-y-4">
          {groups.map(g => (
            <div key={g}>
              <p className="font-mono text-[8px] tracking-[0.18em] text-ink-2 uppercase mb-2">{g}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {visible.filter(t => t.area === g).map(t => (
                  <label key={t.id} className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggle(t.id)} className="mt-0.5 accent-salvia-700" />
                    <span className="font-sans text-sm">
                      {t.name}
                      <span className="block font-mono text-[8px] tracking-[0.1em] text-ink-2">
                        {t.price != null ? formatCOP(t.price) : "Sin precio"} · {t.turnaround} · {t.sampleType}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
          {groups.length === 0 && <p className="font-sans text-xs text-ink-2">Ningún examen coincide.</p>}
        </div>
        <p className="font-sans text-[11px] text-ink-2 mt-1.5">Los perfiles no aparecen: ya son sumas de exámenes; elige los exámenes sueltos.</p>
      </div>

      {edit?.used && (
        <p className="font-sans text-xs text-ink bg-amber-50 border border-amber-200 px-3 py-2">
          Este examen ya se usó en órdenes. Nombre, categoría, precio y clientes se cambian de una vez; si cambias los exámenes
          incluidos se crea una versión nueva y las órdenes anteriores conservan la de antes. El precio nuevo aplica a las
          órdenes nuevas (las ya registradas se ajustan en Caja).
        </p>
      )}
      {error && <p className="font-mono text-[9px] tracking-[0.15em] text-red-600 uppercase">{error}</p>}
      {done && <p className="font-mono text-[9px] tracking-[0.15em] text-salvia-700 uppercase">{done}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || !name.trim() || !finalArea || clinicIds.length === 0 || selected.length === 0 || !(Number(price) > 0)}
          className="bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.22em] uppercase px-6 py-3 hover:bg-salvia-800 transition-colors disabled:opacity-50"
        >
          {edit ? (pending ? "Guardando…" : "Guardar cambios →") : pending ? "Creando…" : "Crear examen personalizado →"}
        </button>
        {edit && (
          <button type="button" onClick={onClose} className="font-mono text-[10px] tracking-[0.18em] uppercase px-4 py-3 border border-black/20 hover:bg-black/5">
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}

const inputClass =
  "w-full border border-black/20 bg-white px-3 py-2 text-sm font-sans focus:outline-2 focus:outline-salvia-700 focus:outline-offset-0"

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block font-mono text-[9px] tracking-[0.18em] uppercase text-salvia-700 mb-1.5">{children}</label>
}
