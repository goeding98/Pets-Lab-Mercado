"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateCustomExamClients } from "@/actions/customExams"
import ClientPicker from "./ClientPicker"

// Clientes a los que les sale el personalizado, con opción de cambiarlos
export default function ClientsEditor({
  id, selected, clinics,
}: {
  id: string
  selected: { id: string; name: string }[]
  clinics: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [ids, setIds] = useState(selected.map(c => c.id))
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  if (!editing) {
    return (
      <p className="font-sans text-xs text-ink mt-1.5">
        <span className="font-mono text-[8px] tracking-[0.15em] uppercase text-salvia-700 mr-1.5">Clientes:</span>
        {selected.map(c => c.name).join(", ")}
        <button type="button" onClick={() => setEditing(true)} className="ml-2 font-mono text-[8px] tracking-[0.15em] uppercase text-salvia-700 hover:underline">
          Cambiar
        </button>
      </p>
    )
  }

  function save() {
    setError("")
    startTransition(async () => {
      const res = await updateCustomExamClients(id, ids)
      if (res.error) return setError(res.error)
      setEditing(false)
      router.refresh()
    })
  }

  return (
    <div className="mt-2 max-w-xl">
      <ClientPicker clinics={clinics} selected={ids} onChange={setIds} />
      {error && <p className="font-sans text-xs text-red-600 mt-1">{error}</p>}
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={save} disabled={pending} className="font-mono text-[9px] tracking-[0.15em] uppercase bg-salvia-700 text-bone px-3 py-1.5 disabled:opacity-50">
          {pending ? "Guardando…" : "Guardar clientes"}
        </button>
        <button type="button" onClick={() => { setIds(selected.map(c => c.id)); setEditing(false) }} disabled={pending} className="font-mono text-[9px] tracking-[0.15em] uppercase border border-black/15 px-3 py-1.5">
          Cancelar
        </button>
      </div>
    </div>
  )
}
