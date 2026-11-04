"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { locateMissingBranches } from "@/actions/geo"

export default function LocateMissingButton() {
  const router = useRouter()
  const [msg, setMsg] = useState("")
  const [pending, start] = useTransition()
  return (
    <span className="flex items-center gap-3">
      {msg && <span className="font-sans text-xs text-ink-2">{msg}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => {
          const r = await locateMissingBranches()
          setMsg(r.located ? `${r.located} ubicadas.` : "No se encontraron más; revisa esas direcciones.")
          router.refresh()
        })}
        className="font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 border border-salvia-700 text-salvia-700 hover:bg-salvia-700 hover:text-bone disabled:opacity-50"
      >
        {pending ? "Ubicando…" : "Ubicar las que faltan"}
      </button>
    </span>
  )
}
