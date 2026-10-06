"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateOrderInfo, type OrderInfoInput } from "@/actions/orderInfo"

// "Editar datos" de la muestra: corrige paciente, tutor, clínica, sede y veterinario (solo personal)
type ClinicOption = { id: string; name: string; branches: { id: string; name: string; address: string }[] }

export default function OrderInfoEditor({ orderId, initial, clinics }: {
  orderId: string
  initial: OrderInfoInput
  clinics: ClinicOption[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [v, setV] = useState<OrderInfoInput>(initial)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  const set = (k: keyof OrderInfoInput, val: string) => setV(prev => ({ ...prev, [k]: val }))
  const branches = clinics.find(c => c.id === v.clinicId)?.branches ?? []

  function changeClinic(id: string) {
    const b = clinics.find(c => c.id === id)?.branches ?? []
    setV(prev => ({ ...prev, clinicId: id, branchId: b.length === 1 ? b[0].id : "" }))
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    startTransition(async () => {
      const res = await updateOrderInfo(orderId, v)
      if (res.error) return setError(res.error)
      setOpen(false)
      router.refresh()
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setV(initial); setOpen(true) }}
        className="border border-black/20 text-ink font-mono text-[10px] tracking-[0.18em] uppercase px-4 py-2.5 hover:bg-black/[0.03] transition-colors"
      >
        Editar datos
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-start justify-center overflow-y-auto p-4" onClick={() => !pending && setOpen(false)}>
      <form onSubmit={save} onClick={e => e.stopPropagation()} className="bg-bone border border-black/10 w-full max-w-2xl mt-10 p-5 md:p-6 space-y-5">
        <div>
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Corregir datos de la muestra</p>
          <p className="font-sans text-xs text-ink-2 mt-1">Los cambios quedan anotados en las observaciones de la orden (antes → después).</p>
        </div>

        <fieldset className="grid grid-cols-2 gap-3">
          <legend className={legend}>Paciente</legend>
          <div className="col-span-2 md:col-span-1">
            <Label>Nombre del paciente *</Label>
            <input value={v.patientName} onChange={e => set("patientName", e.target.value)} required className={input} />
          </div>
          <div>
            <Label>Especie *</Label>
            <select value={v.species} onChange={e => set("species", e.target.value)} className={input}>
              <option>Canino</option><option>Felino</option><option>Otro</option>
            </select>
          </div>
          <div>
            <Label>Raza</Label>
            <input value={v.breed} onChange={e => set("breed", e.target.value)} className={input} />
          </div>
          <div>
            <Label>Edad</Label>
            <input value={v.age} onChange={e => set("age", e.target.value)} className={input} />
          </div>
          <div>
            <Label>Sexo</Label>
            <select value={v.sex} onChange={e => set("sex", e.target.value)} className={input}>
              <option value="">ND</option><option value="M">Macho</option><option value="H">Hembra</option>
            </select>
          </div>
          <div>
            <Label>Tutor (dueño)</Label>
            <input value={v.ownerName} onChange={e => set("ownerName", e.target.value)} className={input} />
          </div>
        </fieldset>

        <fieldset className="grid grid-cols-2 gap-3">
          <legend className={legend}>Procedencia</legend>
          <div>
            <Label>Clínica remitente</Label>
            <select value={v.clinicId} onChange={e => changeClinic(e.target.value)} className={input}>
              <option value="">Sin clínica</option>
              {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {branches.length > 0 && (
            <div>
              <Label>Sede *</Label>
              <select value={v.branchId} onChange={e => set("branchId", e.target.value)} required className={input}>
                {branches.length > 1 && <option value="">Seleccionar sede…</option>}
                {branches.map(b => <option key={b.id} value={b.id}>{b.name} — {b.address}</option>)}
              </select>
            </div>
          )}
          <div className={branches.length > 0 ? "col-span-2" : ""}>
            <Label>Veterinario solicitante</Label>
            <input value={v.requestingVet} onChange={e => set("requestingVet", e.target.value)} className={input} />
          </div>
        </fieldset>

        {v.species !== initial.species && (
          <p className="font-sans text-xs text-amber-900 bg-amber-50 border border-amber-200 px-3 py-2">
            Al cambiar la especie, los rangos de referencia del reporte pasan a ser los de {v.species.toLowerCase()}. Si ya hay
            resultados guardados, revisa el examen y vuelve a guardarlo para recalcular lo que está fuera de rango.
          </p>
        )}
        {error && <p className="font-sans text-xs text-red-600">{error}</p>}

        <div className="flex gap-2">
          <button type="submit" disabled={pending} className="bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.22em] uppercase px-5 py-2.5 hover:bg-salvia-800 disabled:opacity-60">
            {pending ? "Guardando…" : "Guardar cambios →"}
          </button>
          <button type="button" disabled={pending} onClick={() => setOpen(false)} className="border border-black/15 font-mono text-[10px] tracking-[0.18em] uppercase px-4 py-2.5">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

const input = "w-full border border-black/20 bg-white px-3 py-2 text-sm font-sans focus:outline-2 focus:outline-salvia-700"
const legend = "font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-2 col-span-2"
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block font-mono text-[8px] tracking-[0.18em] uppercase text-ink-2 mb-1">{children}</label>
}
