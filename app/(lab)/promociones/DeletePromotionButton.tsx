"use client"
import { useState, useTransition } from "react"
import { deletePromotion } from "@/actions/promotions"

export default function DeletePromotionButton({ id, name, used }: { id: string; name: string; used: boolean }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="font-mono text-[9px] tracking-[0.15em] uppercase text-red-700 hover:underline shrink-0"
      >
        Eliminar
      </button>
    )
  }

  return (
    <div className="shrink-0 text-right max-w-[240px]">
      <p className="font-sans text-[11px] text-ink-2 mb-1.5">
        {used
          ? `“${name}” ya está en órdenes: se retirará (no aparecerá en órdenes nuevas) y las órdenes existentes la conservan.`
          : `¿Eliminar “${name}”?`}
      </p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="font-mono text-[9px] tracking-[0.15em] uppercase border border-black/15 px-2.5 py-1"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() => startTransition(async () => { await deletePromotion(id) })}
          disabled={pending}
          className="font-mono text-[9px] tracking-[0.15em] uppercase bg-red-700 text-bone px-2.5 py-1 disabled:opacity-50"
        >
          {pending ? "…" : used ? "Retirar" : "Eliminar"}
        </button>
      </div>
    </div>
  )
}
