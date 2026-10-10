"use client"
import { useState, useTransition } from "react"
import { updateMyBillingEmail } from "../actions"

// Correo de facturación de la clínica (Portal Vet): a donde le llegan las facturas. Editable.
export default function BillingEmail({ initial }: { initial: string }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initial)
  const [current, setCurrent] = useState(initial)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function save() {
    setError("")
    startTransition(async () => {
      const res = await updateMyBillingEmail(value)
      if (res.error) return setError(res.error)
      setCurrent(value.trim().toLowerCase())
      setEditing(false)
    })
  }

  return (
    <div className="font-sans text-[12px] text-ink-2 mt-1.5">
      <span className="font-mono text-[9px] tracking-[0.15em] uppercase text-salvia-700 mr-1.5">Correo de facturación:</span>
      {editing ? (
        <span className="inline-flex flex-wrap items-center gap-1.5 align-middle">
          <input type="email" value={value} onChange={e => setValue(e.target.value)} autoFocus
            onKeyDown={e => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false) }}
            className="border border-black/20 bg-white px-2 py-1 text-xs w-64 focus:outline-none focus:border-salvia-700" />
          <button type="button" onClick={save} disabled={pending} className="bg-salvia-700 text-bone font-mono text-[9px] tracking-[0.15em] uppercase px-2.5 py-1 disabled:opacity-50">
            {pending ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" onClick={() => { setEditing(false); setValue(current) }} className="font-mono text-[9px] tracking-[0.15em] uppercase">Cancelar</button>
        </span>
      ) : (
        <>
          <span className="text-ink">{current || "sin registrar"}</span>
          <button type="button" onClick={() => setEditing(true)} className="ml-2 font-mono text-[9px] tracking-[0.15em] uppercase text-salvia-700 hover:underline">Cambiar</button>
        </>
      )}
      {error && <span className="block text-red-600 mt-1">{error}</span>}
    </div>
  )
}
