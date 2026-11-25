"use client"
// Candado de "Día a día" (código) y elección del mensajero (color) — se guardan en este celular
import { useState, useTransition } from "react"
import { setDayColor, unlockDayToDay } from "@/actions/routeDay"

export function UnlockForm() {
  const [code, setCode] = useState("")
  const [error, setError] = useState("")
  const [pending, start] = useTransition()
  return (
    <form
      onSubmit={e => { e.preventDefault(); start(async () => { setError(""); const r = await unlockDayToDay(code).catch(() => ({ error: "No hubo conexión. Intenta de nuevo." })); if (r.error) setError(r.error) }) }}
      className="max-w-sm border border-black/10 bg-white p-5 space-y-3"
    >
      <p className="font-sans text-sm text-ink-2">Esta sección todavía está en prueba. Escribe el código para entrar.</p>
      <input value={code} onChange={e => setCode(e.target.value)} inputMode="numeric" autoComplete="off" placeholder="Código"
        className="w-full border border-black/20 bg-white px-3 py-3 text-lg font-mono tracking-[0.3em] focus:outline-2 focus:outline-salvia-700" aria-label="Código" />
      {error && <p className="font-sans text-sm text-red-700">{error}</p>}
      <button disabled={pending} className="w-full bg-salvia-700 text-bone font-mono text-[11px] tracking-[0.2em] uppercase py-3.5 disabled:opacity-60">
        {pending ? "…" : "Entrar"}
      </button>
    </form>
  )
}

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
