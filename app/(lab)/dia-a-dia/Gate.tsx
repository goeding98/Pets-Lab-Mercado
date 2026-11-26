"use client"
// Elección del mensajero (color) en "Día a día" — se guarda en este celular
import { useState, useTransition } from "react"
import { setDayColor } from "@/actions/routeDay"

export function ColorPicker({ options, current }: { options: { nombre: string; color: string }[]; current?: string }) {
  const [pending, start] = useTransition()
  const [error, setError] = useState("")
  return (
    <div className="space-y-3">
      <p className="font-sans text-sm text-ink-2">¿Qué mensajero eres hoy?</p>
      <div className="grid grid-cols-2 gap-3 max-w-sm">
        {options.map(o => (
          <button key={o.nombre} type="button" disabled={pending}
            onClick={() => start(async () => { const r = await setDayColor(o.nombre).catch(() => ({ error: "No hubo conexión." })); if (r.error) setError(r.error) })}
            className={`py-5 text-white font-sans text-lg font-semibold disabled:opacity-60 ${current === o.nombre ? "ring-4 ring-offset-2 ring-ink" : ""}`}
            style={{ background: o.color }}>
            {o.nombre}
          </button>
        ))}
      </div>
      {error && <p className="font-sans text-sm text-red-700">{error}</p>}
    </div>
  )
}
