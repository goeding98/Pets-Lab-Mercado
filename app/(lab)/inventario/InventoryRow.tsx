"use client"
import { useState, useTransition } from "react"
import { updateInventoryItem, deleteInventoryItem, adjustStock } from "@/actions/inventory"
import type { InventoryItem } from "@prisma/client"

export default function InventoryRow({ item, isEven }: { item: InventoryItem; isEven: boolean }) {
  const [editing, setEditing] = useState(false)
  const [delta, setDelta] = useState("")
  const [pending, startTransition] = useTransition()

  const low = item.minStock != null && item.stock < item.minStock
  const negative = item.stock < 0

  function handleSaveEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      await updateInventoryItem(item.id, fd)
      setEditing(false)
    })
  }

  function handleDelete() {
    if (!confirm(`¿Eliminar "${item.name}" del inventario? Esta acción no se puede deshacer.`)) return
    startTransition(() => deleteInventoryItem(item.id))
  }

  function handleAdjust(sign: 1 | -1) {
    const n = Number(delta)
    if (!n || n <= 0) return
    startTransition(async () => {
      await adjustStock(item.id, n * sign)
      setDelta("")
    })
  }

  if (editing) {
    return (
      <tr className={`border-b border-black/[0.06] bg-salvia-50/60`}>
        <td colSpan={5} className="px-4 py-3">
          <form onSubmit={handleSaveEdit} className="flex flex-wrap items-end gap-3">
            <div>
              <FieldLabel>Nombre</FieldLabel>
              <input name="name" defaultValue={item.name} required className={inputClass} />
            </div>
            <div>
              <FieldLabel>Presentación</FieldLabel>
              <input name="unit" defaultValue={item.unit} required className={`${inputClass} w-24`} />
            </div>
            <div>
              <FieldLabel>Mínimo</FieldLabel>
              <input name="minStock" type="number" step="any" min="0" defaultValue={item.minStock ?? ""} className={`${inputClass} w-28`} />
            </div>
            <button type="submit" disabled={pending} className="bg-salvia-700 text-bone font-mono text-[9px] tracking-[0.18em] uppercase px-4 py-2 hover:bg-salvia-800 disabled:opacity-60">
              Guardar
            </button>
            <button type="button" onClick={() => setEditing(false)} className="font-mono text-[9px] tracking-[0.18em] uppercase text-ink-2 hover:text-ink px-2 py-2">
              Cancelar
            </button>
          </form>
        </td>
      </tr>
    )
  }

  return (
    <tr className={`border-b border-black/[0.06] hover:bg-salvia-50/50 transition-colors ${isEven ? "bg-black/[0.015]" : ""}`}>
      <td className="px-4 py-3 font-sans text-sm">{item.name}</td>
      <td className="px-4 py-3 font-mono text-[11px] text-ink-2 uppercase">{item.unit}</td>
      <td className="px-4 py-3">
        <span className={`font-mono text-xs ${negative ? "text-red-600 font-bold" : low ? "text-red-600" : "text-ink"}`}>
          {item.stock}
        </span>
        {item.minStock != null && (
          <span className="font-mono text-[9px] text-ink-2 ml-1.5">/ mín. {item.minStock}</span>
        )}
        {(low || negative) && (
          <span className="ml-2 font-mono text-[8px] tracking-[0.1em] uppercase bg-red-100 text-red-700 px-1.5 py-0.5">
            Bajo
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            step="any"
            min="0"
            value={delta}
            onChange={e => setDelta(e.target.value)}
            placeholder="Cant."
            className="w-16 border border-black/20 bg-white px-1.5 py-1 text-xs font-mono focus:outline-salvia-700"
          />
          <button
            onClick={() => handleAdjust(1)}
            disabled={pending}
            title="Registrar entrada"
            className="font-mono text-[10px] px-2 py-1 border border-azul-700 text-azul-700 hover:bg-azul-50 disabled:opacity-50"
          >
            + Entrada
          </button>
          <button
            onClick={() => handleAdjust(-1)}
            disabled={pending}
            title="Registrar salida"
            className="font-mono text-[10px] px-2 py-1 border border-black/30 text-ink-2 hover:bg-black/5 disabled:opacity-50"
          >
            − Salida
          </button>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setEditing(true)} className="font-mono text-[9px] tracking-[0.15em] uppercase text-salvia-700 hover:underline">
            Editar
          </button>
          <button onClick={handleDelete} disabled={pending} className="font-mono text-[9px] tracking-[0.15em] uppercase text-red-600 hover:underline disabled:opacity-50">
            Eliminar
          </button>
        </div>
      </td>
    </tr>
  )
}

const inputClass =
  "border border-black/20 bg-white px-2.5 py-1.5 text-sm font-sans focus:outline-2 focus:outline-salvia-700 focus:outline-offset-0"

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block font-mono text-[8px] tracking-[0.15em] uppercase text-salvia-700 mb-1">{children}</label>
}
