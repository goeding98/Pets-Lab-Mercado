"use client"
import { useState, useTransition } from "react"
import { deleteDiscount } from "@/actions/discounts"

export default function DeleteDiscountButton({ id, label }: { id: string; label: string }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="font-mono text-[9px] tracking-[0.15em] uppercase text-red-700 hover:underline shrink-0">
        Eliminar
      </button>
    )
  }
  return (
    <div className="shrink-0 text-right max-w-[240px]">
      <p className="font-sans text-[11px] text-ink-2 mb-1.5">¿Eliminar el descuento del {label}? Las muestras ya registradas conservan su precio.</p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setConfirming(false)} disabled={pending} className="font-mono text-[9px] tracking-[0.15em] uppercase border border-black/15 px-2.5 py-1">
          Cancelar
        </button>
        <button type="button" onClick={() => startTransition(async () => { await deleteDiscount(id) })} disabled={pending}
          className="font-mono text-[9px] tracking-[0.15em] uppercase bg-red-700 text-white px-2.5 py-1 disabled:opacity-50">
          {pending ? "Eliminando…" : "Eliminar"}
        </button>
      </div>
    </div>
  )
}
