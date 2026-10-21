"use client"
import { useState, useTransition } from "react"
import { createDiscount } from "@/actions/discounts"

const input = "w-full border border-black/20 bg-white px-3 py-2 text-sm font-sans focus:outline-2 focus:outline-salvia-700"
const label = "block font-mono text-[9px] tracking-[0.18em] uppercase text-salvia-700 mb-1.5"

export default function NewDiscountForm({ clinics, areas, today }: { clinics: { id: string; name: string }[]; areas: string[]; today: string }) {
  const [clinicId, setClinicId] = useState("")
  const [percent, setPercent] = useState("")
  const [all, setAll] = useState(true)
  const [picked, setPicked] = useState<string[]>([])
  const [startDate, setStart] = useState(today)
  const [endDate, setEnd] = useState("")
  const [note, setNote] = useState("")
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const toggle = (a: string) => setPicked(p => (p.includes(a) ? p.filter(x => x !== a) : [...p, a]))
  const ready = clinicId && Number(percent) > 0 && startDate && endDate && (all || picked.length > 0)

  function save() {
    setMsg(null)
    startTransition(async () => {
      const r = await createDiscount({ clinicId, percent: Number(percent), areas: all ? [] : picked, startDate, endDate, note })
      if (r.error) return setMsg({ ok: false, text: r.error })
      setMsg({ ok: true, text: "Descuento creado." })
      setPercent(""); setPicked([]); setAll(true); setEnd(""); setNote("")
    })
  }

  return (
    <section className="bg-white border border-black/[0.08] p-5">
      <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-4">Nuevo descuento</p>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2"><span className={label}>Cliente *</span>
          <select value={clinicId} onChange={e => setClinicId(e.target.value)} className={input}>
            <option value="">Elegir…</option>{clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select></div>
        <div><span className={label}>Descuento (%) *</span>
          <input type="number" min={1} max={100} step="any" value={percent} onChange={e => setPercent(e.target.value)} placeholder="Ej. 10" className={input} /></div>
        <div className="hidden sm:block" />
        <div><span className={label}>Desde *</span>
          <input type="date" value={startDate} onChange={e => setStart(e.target.value)} className={input} /></div>
        <div><span className={label}>Hasta (inclusive) *</span>
          <input type="date" value={endDate} min={startDate} onChange={e => setEnd(e.target.value)} className={input} /></div>
        <div className="sm:col-span-2"><span className={label}>Exámenes *</span>
          <label className="flex items-center gap-2 font-sans text-sm text-ink mb-2">
            <input type="radio" checked={all} onChange={() => setAll(true)} className="accent-salvia-700" /> Todos los exámenes
          </label>
          <label className="flex items-center gap-2 font-sans text-sm text-ink">
            <input type="radio" checked={!all} onChange={() => setAll(false)} className="accent-salvia-700" /> Solo estas áreas:
          </label>
          {!all && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 mt-2 pl-6">
              {areas.map(a => (
                <label key={a} className="flex items-center gap-2 font-sans text-sm text-ink">
                  <input type="checkbox" checked={picked.includes(a)} onChange={() => toggle(a)} className="accent-salvia-700" /> {a}
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="sm:col-span-2"><span className={label}>Nota (opcional)</span>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Ej. Campaña de octubre" className={input} /></div>
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-5">
        <button type="button" onClick={save} disabled={pending || !ready}
          className="bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.2em] uppercase px-5 py-2.5 hover:bg-salvia-800 disabled:opacity-50">
          {pending ? "Guardando…" : "Crear descuento"}
        </button>
        {msg && <p className={`font-sans text-sm ${msg.ok ? "text-salvia-700" : "text-red-600"}`}>{msg.text}</p>}
      </div>
    </section>
  )
}
