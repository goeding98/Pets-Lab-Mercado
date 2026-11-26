"use client"
// "Activar plataforma de promoción" en la ficha de la clínica: el comercial la activa cuando la socializa con el cliente
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { setClinicPlatform } from "@/actions/clinicPlatform"

export default function PlatformToggle({ clinicId, enabled, since, by }: { clinicId: string; enabled: boolean; since: string | null; by: string | null }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [ask, setAsk] = useState(false)
  const [error, setError] = useState("")
  const run = (on: boolean) => start(async () => {
    setError("")
    const r = await setClinicPlatform(clinicId, on).catch(() => ({ error: "No hubo conexión. Intenta de nuevo." }))
    if (r.error) setError(r.error); else { setAsk(false); router.refresh() }
  })

  return (
    <div className={`border px-4 py-3 ${enabled ? "border-salvia-700/30 bg-salvia-50" : "border-black/10 bg-white"}`}>
      {enabled ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-sans text-sm">
            <b className="text-salvia-700">Plataforma activa.</b> Pide recogidas en el Portal Vet con garantía de 1 h 30 y sus pedidos
            les llegan a los mensajeros en el Día a día.
            {since && <span className="block text-[12px] text-ink-2">Activada{by ? ` por ${by}` : ""} el {since}.</span>}
          </p>
          {!ask ? (
            <button type="button" onClick={() => setAsk(true)} className="font-mono text-[9px] tracking-[0.15em] uppercase text-ink-2 underline">Desactivar</button>
          ) : (
            <span className="flex items-center gap-2 font-sans text-sm">
              ¿Desactivar? Vuelve al portal de siempre.
              <button type="button" disabled={pending} onClick={() => run(false)} className="bg-ink text-bone font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 disabled:opacity-60">Sí</button>
              <button type="button" onClick={() => setAsk(false)} className="font-mono text-[9px] tracking-[0.15em] uppercase underline">No</button>
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-sans text-sm text-ink-2 max-w-md">
            Al activarla, la clínica pide recogidas en un clic desde su Portal Vet, con garantía de 1 h 30 (50 % si llegamos tarde),
            y sus pedidos entran al Día a día de los mensajeros.
          </p>
          <button type="button" disabled={pending} onClick={() => run(true)}
            className="bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.18em] uppercase px-4 py-2.5 hover:bg-salvia-800 disabled:opacity-60">
            {pending ? "Activando…" : "Activar plataforma de promoción"}
          </button>
        </div>
      )}
      {error && <p className="font-sans text-sm text-red-700 mt-2">{error}</p>}
    </div>
  )
}
