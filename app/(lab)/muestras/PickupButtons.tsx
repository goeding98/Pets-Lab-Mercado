"use client"
// Botones del laboratorio para una recogida pedida desde el Portal Vet: "Recogida" / "No estaba lista"
import { useState, useTransition } from "react"
import { setPickupOutcome } from "@/actions/pickups"

export default function PickupButtons({ pickupId }: { pickupId: string }) {
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null)
  const go = (outcome: "RECOGIDA" | "NO_LISTA") => start(async () => {
    setMsg(null)
    const r = await setPickupOutcome(pickupId, outcome).catch(() => ({ error: "No hubo conexión. Intenta de nuevo." }) as { error?: string; late?: boolean })
    if (r.error) setMsg({ text: r.error, bad: true })
    else if (outcome === "RECOGIDA") setMsg({ text: r.late ? "Recogida tarde: se aplicó el 50 % a esas muestras." : "Recogida a tiempo." })
  })
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={pending} onClick={() => go("RECOGIDA")}
        className="bg-salvia-700 text-bone font-mono text-[9px] tracking-[0.18em] uppercase px-3 py-2 hover:bg-salvia-800 disabled:opacity-60">
        Recogida
      </button>
      <button type="button" disabled={pending} onClick={() => go("NO_LISTA")}
        className="border border-black/25 font-mono text-[9px] tracking-[0.18em] uppercase px-3 py-2 hover:bg-black/[0.03] disabled:opacity-60">
        No estaba lista
      </button>
      {msg && <span className={`font-sans text-[12px] ${msg.bad ? "text-red-700" : "text-salvia-700"}`}>{msg.text}</span>}
    </div>
  )
}
