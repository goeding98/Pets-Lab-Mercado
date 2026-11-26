"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { markBonusPaid, undoBonusPaid } from "@/actions/bonus"

export default function PayButton({ userId, month, label, amount, paid }: { userId: string; month: string; label: string; amount: string; paid: boolean }) {
  const router = useRouter()
  const [ask, setAsk] = useState<"pay" | "undo" | null>(null)
  const [err, setErr] = useState("")
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<{ error?: string }>) => start(async () => {
    const r = await fn().catch(() => ({ error: "No hubo conexión. Intenta de nuevo." }))
    setAsk(null)
    if (r.error) setErr(r.error)
    else { setErr(""); router.refresh() }
  })
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {!ask && (
        <>
          <button type="button" onClick={() => setAsk("pay")}
            className="bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.15em] uppercase px-3 py-2">
            {label}
          </button>
          {paid && (
            <button type="button" onClick={() => setAsk("undo")} className="font-mono text-[10px] tracking-[0.15em] uppercase underline text-ink-2">
              Deshacer pago
            </button>
          )}
        </>
      )}
      {ask && (
        <span className="flex flex-wrap items-center gap-2 font-sans text-sm">
          {ask === "pay" ? `¿Registrar pago de ${amount}?` : "¿Quitar el pago registrado?"}
          <button type="button" disabled={pending}
            onClick={() => run(() => (ask === "pay" ? markBonusPaid(userId, month) : undoBonusPaid(userId, month)))}
            className="bg-ink text-bone font-mono text-[10px] tracking-[0.15em] uppercase px-3 py-2 disabled:opacity-60">
            {pending ? "…" : "Sí"}
          </button>
          <button type="button" onClick={() => setAsk(null)} className="font-mono text-[10px] tracking-[0.15em] uppercase underline">No</button>
        </span>
      )}
      {err && <p className="w-full text-right font-sans text-xs text-red-700">{err}</p>}
    </div>
  )
}
