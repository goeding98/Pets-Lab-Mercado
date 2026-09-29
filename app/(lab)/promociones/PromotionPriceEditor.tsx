"use client"
import { useState, useTransition } from "react"
import { updatePromotionPrice } from "@/actions/promotions"

function money(n: number) {
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
}

export default function PromotionPriceEditor({ id, price }: { id: string; price: number | null }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(price?.toString() ?? "")
  const [pending, startTransition] = useTransition()

  function save() {
    const next = value.trim() === "" ? null : Number(value)
    if (next !== null && (!Number.isFinite(next) || next < 0)) return
    startTransition(async () => {
      await updatePromotionPrice(id, next)
      setEditing(false)
    })
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        title="Editar precio"
        className="shrink-0 text-right group"
      >
        <span className={`block font-mono text-sm ${price != null ? "text-ink" : "text-ink-2"}`}>
          {price != null ? money(price) : "Sin precio"}
        </span>
        <span className="font-mono text-[8px] tracking-[0.15em] uppercase text-salvia-700 group-hover:underline">
          Editar precio
        </span>
      </button>
    )
  }

  return (
    <div className="shrink-0 flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        step={100}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") save()
          if (e.key === "Escape") setEditing(false)
        }}
        autoFocus
        placeholder="Sin precio"
        className="w-28 border border-black/20 bg-white px-2 py-1 text-sm font-mono focus:outline-2 focus:outline-salvia-700"
      />
      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="font-mono text-[9px] tracking-[0.15em] uppercase bg-salvia-700 text-bone px-2.5 py-1.5 disabled:opacity-50"
      >
        {pending ? "…" : "OK"}
      </button>
    </div>
  )
}
