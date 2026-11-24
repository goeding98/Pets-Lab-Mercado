"use client"
// "Ya está lista": vuelve a pedir la recogida de las muestras que no estaban listas cuando pasó el mensajero
import { useState, useTransition } from "react"
import { requestPickupAgain } from "../actions"

export default function RequestAgainButton({ branchId }: { branchId: string | null }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState("")
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => {
          setError("")
          const r = await requestPickupAgain(branchId).catch(() => ({ error: "No hubo conexión. Intenta de nuevo." }))
          if (r.error) setError(r.error)
        })}
        className="bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.18em] uppercase px-4 py-2.5 hover:bg-salvia-800 transition-colors disabled:opacity-60"
      >
        {pending ? "Pidiendo…" : "Ya está lista: pedir recogida"}
      </button>
      {error && <span className="font-sans text-[13px] text-red-700">{error}</span>}
    </div>
  )
}
