"use client"
// Quita el mapa armado a mano: el Plan de mensajeros vuelve al automático (confirmación en la misma página)
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { clearManualRoutes } from "@/actions/manualRoutes"

export default function BackToAutomatic() {
  const router = useRouter()
  const [ask, setAsk] = useState(false)
  const [error, setError] = useState("")
  const [pending, start] = useTransition()
  if (!ask) {
    return (
      <button type="button" onClick={() => setAsk(true)}
        className="border border-black/20 bg-white font-mono text-[10px] tracking-[0.15em] uppercase px-4 py-2.5 hover:border-ink">
        Volver al automático
      </button>
    )
  }
  return (
    <span className="flex flex-wrap items-center gap-2 bg-amber-50 border border-amber-300 px-3 py-2 font-sans text-sm">
      ¿Borrar el mapa armado y volver al automático?
      <button type="button" disabled={pending}
        onClick={() => start(async () => {
          const r = await clearManualRoutes().catch(() => ({ error: "No hubo conexión." }))
          if (r.error) setError(r.error); else { setAsk(false); router.refresh() }
        })}
        className="bg-ink text-bone font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 disabled:opacity-60">Sí</button>
      <button type="button" onClick={() => setAsk(false)} className="font-mono text-[9px] tracking-[0.15em] uppercase underline">No</button>
      {error && <span className="text-red-700">{error}</span>}
    </span>
  )
}
