"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { addBranch, deleteBranch, updateBranch, type BranchInput } from "@/actions/branches"

// Sedes de una clínica: lista editable + agregar. Se usa en /clientes/[id] (staff) y en
// /portal-vet/sedes (la propia clínica).
export type BranchRow = {
  id: string
  name: string
  address: string
  neighborhood: string | null
  city: string | null
  phone: string | null
  orders: number
}

const EMPTY: BranchInput = { name: "", address: "", neighborhood: "", city: "Cali", phone: "" }
const inputClass = "w-full border border-black/20 bg-white px-3 py-2 text-sm font-sans focus:outline-2 focus:outline-salvia-700"

function BranchFields({ value, onChange }: { value: BranchInput; onChange: (v: BranchInput) => void }) {
  const field = (key: keyof BranchInput, label: string, placeholder: string, full = false, required = false) => (
    <div className={full ? "col-span-2" : "col-span-2 sm:col-span-1"}>
      <label className="block font-mono text-[9px] tracking-[0.18em] uppercase text-salvia-700 mb-1.5">
        {label}{required && " *"}
      </label>
      <input
        value={value[key]}
        onChange={e => onChange({ ...value, [key]: e.target.value })}
        placeholder={placeholder}
        required={required}
        className={inputClass}
      />
    </div>
  )
  return (
    <div className="grid grid-cols-2 gap-3">
      {field("name", "Nombre de la sede", "Ej. Sede Norte", false, true)}
      {field("phone", "Teléfono", "Ej. 315 000 0000")}
      {field("address", "Dirección", "Ej. Cra 5 #20-30", true, true)}
      {field("neighborhood", "Barrio", "Ej. San Fernando")}
      {field("city", "Ciudad", "Cali")}
    </div>
  )
}

function BranchItem({ branch }: { branch: BranchRow }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState<BranchInput>({
    name: branch.name, address: branch.address, neighborhood: branch.neighborhood ?? "", city: branch.city ?? "", phone: branch.phone ?? "",
  })
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function run(fn: () => Promise<{ error?: string }>, after?: () => void) {
    setError("")
    startTransition(async () => {
      const res = await fn()
      if (res.error) return setError(res.error)
      after?.()
      router.refresh()
    })
  }

  if (editing) {
    return (
      <form
        onSubmit={e => { e.preventDefault(); run(() => updateBranch(branch.id, value), () => setEditing(false)) }}
        className="px-4 py-4 bg-salvia-50/60"
      >
        <BranchFields value={value} onChange={setValue} />
        {error && <p className="font-sans text-xs text-red-600 mt-2">{error}</p>}
        <div className="flex gap-3 mt-3">
          <button type="submit" disabled={pending} className="bg-salvia-700 text-bone font-mono text-[9px] tracking-[0.18em] uppercase px-4 py-2 hover:bg-salvia-800 disabled:opacity-60">
            {pending ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" onClick={() => setEditing(false)} className="font-mono text-[9px] tracking-[0.18em] uppercase text-ink-2 hover:text-ink px-2">
            Cancelar
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="px-4 py-3.5 flex flex-wrap items-start gap-x-4 gap-y-2">
      <div className="flex-1 min-w-[200px]">
        <p className="font-sans text-sm font-medium text-ink">{branch.name}</p>
        <p className="font-sans text-xs text-ink-2 mt-0.5">
          {[branch.address, branch.neighborhood, branch.city].filter(Boolean).join(" · ")}
          {branch.phone && <> · {branch.phone}</>}
        </p>
        {branch.orders > 0 && (
          <p className="font-mono text-[8px] tracking-[0.12em] uppercase text-ink-2 mt-1">
            {branch.orders} {branch.orders === 1 ? "orden" : "órdenes"}
          </p>
        )}
        {error && <p className="font-sans text-xs text-red-600 mt-1">{error}</p>}
      </div>
      <div className="flex gap-4">
        <button type="button" onClick={() => setEditing(true)} className="font-mono text-[9px] tracking-[0.15em] uppercase text-salvia-700 hover:underline py-1">
          Editar
        </button>
        {branch.orders === 0 && (
          <button
            type="button"
            disabled={pending}
            onClick={() => { if (confirm(`¿Eliminar la sede "${branch.name}"?`)) run(() => deleteBranch(branch.id)) }}
            className="font-mono text-[9px] tracking-[0.15em] uppercase text-red-600 hover:text-red-800 py-1 disabled:opacity-50"
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  )
}

export default function BranchManager({ clinicId, branches }: { clinicId: string; branches: BranchRow[] }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState<BranchInput>(EMPTY)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function add(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    startTransition(async () => {
      const res = await addBranch(clinicId, value)
      if (res.error) return setError(res.error)
      setValue(EMPTY)
      setAdding(false)
      router.refresh()
    })
  }

  return (
    <div>
      <div className="border border-black/10 bg-white divide-y divide-black/[0.06]">
        {branches.length === 0 && (
          <p className="px-4 py-5 font-sans text-sm text-ink-2 text-center">Aún no hay sedes registradas.</p>
        )}
        {branches.map(b => <BranchItem key={b.id} branch={b} />)}
      </div>

      {adding ? (
        <form onSubmit={add} className="border border-black/10 border-t-0 px-4 py-4 bg-salvia-50/60">
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-3">Nueva sede</p>
          <BranchFields value={value} onChange={setValue} />
          {error && <p className="font-sans text-xs text-red-600 mt-2">{error}</p>}
          <div className="flex gap-3 mt-3">
            <button type="submit" disabled={pending} className="bg-salvia-700 text-bone font-mono text-[9px] tracking-[0.18em] uppercase px-4 py-2 hover:bg-salvia-800 disabled:opacity-60">
              {pending ? "Agregando…" : "Agregar sede"}
            </button>
            <button type="button" onClick={() => { setAdding(false); setError("") }} className="font-mono text-[9px] tracking-[0.18em] uppercase text-ink-2 hover:text-ink px-2">
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 border border-salvia-700 text-salvia-700 font-mono text-[9px] tracking-[0.18em] uppercase px-4 py-2 hover:bg-salvia-50"
        >
          + Agregar sede
        </button>
      )}
    </div>
  )
}
