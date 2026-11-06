"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteCreditPayment, registerCreditPayment } from "@/actions/credit"
import { PAYMENT_METHODS, formatCOP } from "@/lib/payment"

// Registrar un abono: se aplica a las órdenes a crédito más antiguas primero
export default function PaymentForm({ clinicId, debt, today }: { clinicId: string; debt: number; today: string }) {
  const router = useRouter()
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(today)
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[1].value)
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const value = Number(amount.replace(/\D/g, "")) || 0
  const input = "border border-black/20 bg-white px-3 py-2.5 text-base sm:text-sm font-sans focus:outline-2 focus:outline-salvia-700 w-full"

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setOk(null)
    if (value <= 0) return setError("Escribe el valor del abono.")
    if (value > debt) return setError(`El abono es mayor que lo que debe (${formatCOP(debt)}).`)
    startTransition(async () => {
      const res = await registerCreditPayment(clinicId, value, date, method, note)
      if (res.error) return setError(res.error)
      setOk(`Abono de ${formatCOP(value)} registrado.`)
      setAmount(""); setNote("")
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="border border-salvia-700/30 bg-salvia-50/60 p-4">
      <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-3">Registrar pago</p>
      <div className="grid grid-cols-2 md:grid-cols-[1.2fr_1fr_1fr_1.5fr_auto] gap-3 items-end">
        <label className="block">
          <span className="block font-mono text-[8px] tracking-[0.18em] uppercase text-ink-2 mb-1">Valor</span>
          <input inputMode="numeric" value={value ? value.toLocaleString("es-CO") : ""} onChange={e => setAmount(e.target.value)} placeholder="$ 0" className={input} />
        </label>
        <label className="block">
          <span className="block font-mono text-[8px] tracking-[0.18em] uppercase text-ink-2 mb-1">Fecha</span>
          <input type="date" value={date} max={today} onChange={e => setDate(e.target.value)} className={input} />
        </label>
        <label className="block">
          <span className="block font-mono text-[8px] tracking-[0.18em] uppercase text-ink-2 mb-1">Medio</span>
          <select value={method} onChange={e => setMethod(e.target.value)} className={input}>
            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block font-mono text-[8px] tracking-[0.18em] uppercase text-ink-2 mb-1">Nota</span>
          <input value={note} onChange={e => setNote(e.target.value)} placeholder="Ej. comprobante 1234" className={input} />
        </label>
        <button type="submit" disabled={pending}
          className="col-span-2 md:col-span-1 bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.2em] uppercase px-5 py-3 hover:bg-salvia-800 disabled:opacity-60">
          {pending ? "Guardando…" : "Registrar"}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-2">
        <button type="button" onClick={() => setAmount(String(debt))} className="font-mono text-[9px] tracking-[0.15em] uppercase text-salvia-700 hover:underline">
          Pagó todo ({formatCOP(debt)})
        </button>
        <span className="font-sans text-[11px] text-ink-2">Se aplica a las órdenes más antiguas primero.</span>
      </div>
      {error && <p className="font-sans text-xs text-red-600 mt-2">{error}</p>}
      {ok && <p className="font-sans text-xs text-salvia-700 mt-2">{ok}</p>}
    </form>
  )
}

export function DeletePaymentButton({ id, label }: { id: string; label: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm(`¿Anular el abono de ${label}? Esas órdenes vuelven a quedar con saldo.`)) return
        startTransition(async () => {
          const res = await deleteCreditPayment(id)
          if (res.error) alert(res.error)
          router.refresh()
        })
      }}
      className="font-mono text-[9px] tracking-[0.15em] uppercase text-ink-2 hover:text-red-700 hover:underline disabled:opacity-50"
    >
      {pending ? "Anulando…" : "Anular"}
    </button>
  )
}
