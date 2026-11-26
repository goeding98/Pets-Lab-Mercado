"use client"
// "Eliminar prueba": solo en el Portal Vet de la clínica de demostración (lib/pickups.ts: DEMO_CLINIC_ID)
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { resetDemo } from "../actions"

export default function ResetDemoButton() {
  const router = useRouter()
  const [ask, setAsk] = useState(false)
  const [msg, setMsg] = useState("")
  const [pending, start] = useTransition()
  return (
    <div className="border border-dashed border-amber-400 bg-amber-50 px-4 py-3 mb-6 flex flex-wrap items-center justify-between gap-3">
      <p className="font-sans text-sm text-ink">
        <b>Clínica de prueba.</b> Al terminar la demo, borra todo lo que se pidió para dejarla limpia.
        {msg && <span className="block text-[13px] text-salvia-800 mt-0.5">{msg}</span>}
      </p>
      {!ask ? (
        <button type="button" onClick={() => { setMsg(""); setAsk(true) }}
          className="bg-ink text-bone font-mono text-[10px] tracking-[0.18em] uppercase px-4 py-2.5">
          Eliminar prueba
        </button>
      ) : (
        <span className="flex flex-wrap items-center gap-2 font-sans text-sm">
          ¿Borrar todas las muestras y recogidas de la demo?
          <button type="button" disabled={pending}
            onClick={() => start(async () => {
              const r = await resetDemo().catch(() => ({ error: "No hubo conexión. Intenta de nuevo." }) as { error?: string; removed?: number })
              setAsk(false)
              if (r.error) setMsg(r.error)
              else { setMsg("Listo: la clínica de prueba quedó limpia."); router.replace("/portal-vet/dashboard"); router.refresh() }
            })}
            className="bg-red-700 text-white font-mono text-[10px] tracking-[0.15em] uppercase px-3 py-2 disabled:opacity-60">
            {pending ? "Borrando…" : "Sí, borrar"}
          </button>
          <button type="button" onClick={() => setAsk(false)} className="font-mono text-[10px] tracking-[0.15em] uppercase underline">No</button>
        </span>
      )}
    </div>
  )
}
