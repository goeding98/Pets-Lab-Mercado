"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { setOrderPaid } from "@/actions/payments"
import { PAYMENT_METHODS, formatCOP, type OrderPayment } from "@/lib/payment"

// Pago de la muestra (arriba en el detalle). Marcar "Pagado" registra el pago completo en Caja y
// libera el resultado a la clínica; mientras no haya pago, el resultado queda retenido.
export default function PaymentModule({
  orderId, payment, hasResults, canMark, clinicName,
}: {
  orderId: string
  payment: OrderPayment
  hasResults: boolean // algún examen completado
  canMark: boolean
  clinicName: string | null
}) {
  const router = useRouter()
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0].value)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (payment.noCharge) {
    return (
      <div className="border border-salvia-700/30 bg-salvia-50 px-4 py-3 mb-8 font-sans text-sm text-ink">
        <span className="font-mono text-[8px] tracking-[0.2em] text-salvia-700 uppercase mr-2">Pago</span>
        {clinicName ?? "Este cliente"} es <strong>cliente sin cobro</strong>: los resultados se entregan siempre, sin bloqueo.
      </div>
    )
  }

  function toggle(paid: boolean) {
    if (!paid && !confirm("¿Quitar el pago de esta muestra? Si no hay ningún pago, la clínica deja de ver el resultado.")) return
    setError(null)
    startTransition(async () => {
      try {
        await setOrderPaid(orderId, paid, method)
        router.refresh()
      } catch (e) {
        setError((e as Error).message || "No se pudo guardar el pago.")
      }
    })
  }

  const retained = !payment.released && hasResults
  const box = retained ? "border-red-300 bg-red-50" : payment.released ? "border-azul-200 bg-azul-50/60" : "border-amber-300 bg-amber-50"

  return (
    <div className={`border ${box} px-4 py-4 mb-8`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap gap-x-8 gap-y-2">
          {[
            ["Total a pagar", formatCOP(payment.total)],
            ["Pagado", formatCOP(payment.paid)],
            ["Saldo", formatCOP(payment.balance)],
          ].map(([l, v]) => (
            <div key={l}>
              <p className="font-mono text-[8px] tracking-[0.2em] text-salvia-700 uppercase mb-0.5">{l}</p>
              <p className="font-sans text-base font-medium text-ink">{v}</p>
            </div>
          ))}
        </div>

        {canMark && payment.total > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {!payment.fullyPaid && (
              <select value={method} onChange={e => setMethod(e.target.value)} disabled={pending}
                className="border border-black/20 bg-white px-2 py-1.5 text-xs font-sans">
                {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            )}
            <label className={`flex items-center gap-2 border px-3 py-1.5 cursor-pointer select-none ${payment.fullyPaid ? "border-azul-700 bg-azul-700 text-bone" : "border-black/30 bg-white text-ink"} ${pending ? "opacity-60" : ""}`}>
              <input
                type="checkbox"
                checked={payment.fullyPaid}
                disabled={pending}
                onChange={e => toggle(e.target.checked)}
                className="w-4 h-4 accent-azul-700"
              />
              <span className="font-mono text-[10px] tracking-[0.18em] uppercase">{pending ? "Guardando…" : "Pagado"}</span>
            </label>
          </div>
        )}
      </div>

      <p className="font-sans text-[13px] mt-3 text-ink">
        {payment.total <= 0 ? (
          <>Esta muestra no tiene precio: el resultado se entrega sin cobro. Si se debe cobrar, ponle precio en Caja.</>
        ) : retained ? (
          <><strong className="text-red-700">Resultado retenido:</strong> el cliente no ha pagado. La clínica no lo ve hasta que se marque el pago ({formatCOP(payment.balance)}).</>
        ) : !payment.released ? (
          <>Pendiente de pago. Si no se paga antes, el resultado quedará retenido cuando esté listo.</>
        ) : payment.fullyPaid ? (
          <>Pagado. La clínica recibe el resultado apenas esté listo.</>
        ) : (
          <>Pago parcial: la clínica ya puede ver el resultado. Saldo pendiente {formatCOP(payment.balance)}.</>
        )}
      </p>
      {error && <p className="font-sans text-xs text-red-600 mt-2">{error}</p>}
    </div>
  )
}
