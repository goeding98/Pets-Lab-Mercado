"use client"
import { useRef, useTransition } from "react"
import { createInventoryItem } from "@/actions/inventory"

const UNIT_SUGGESTIONS = ["Unidad", "ML", "GR", "MG", "KG", "L", "CC", "MCG", "Frasco", "Caja", "Tira", "Par"]

export default function NewItemForm() {
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await createInventoryItem(fd)
      formRef.current?.reset()
    })
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="border border-black/10 p-5 mb-6">
      <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-3">Agregar item de inventario</p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
        <div className="col-span-2">
          <Label>Nombre *</Label>
          <Input name="name" required placeholder="Ej. Reactivo tinción Diff-Quik" />
        </div>
        <div>
          <Label>Presentación *</Label>
          <Input name="unit" required list="unit-suggestions" placeholder="Ej. ML" />
          <datalist id="unit-suggestions">
            {UNIT_SUGGESTIONS.map(u => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>
        <div>
          <Label>Stock inicial</Label>
          <Input name="stock" type="number" step="any" min="0" defaultValue="0" />
        </div>
        <div>
          <Label>Mínimo (alerta)</Label>
          <Input name="minStock" type="number" step="any" min="0" placeholder="Opcional" />
        </div>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-4 bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.22em] uppercase px-5 py-2.5 hover:bg-salvia-800 transition-colors disabled:opacity-60"
      >
        {pending ? "Agregando…" : "Agregar item →"}
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

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />
}
