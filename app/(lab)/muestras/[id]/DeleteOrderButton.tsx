"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteOrder } from "@/actions/deleteOrder"
import { removeOpenSample } from "@/components/OpenSamplesBar"

// "Eliminar muestra" (solo ADMIN): diálogo con motivo obligatorio. Queda registro en Muestras eliminadas.
export default function DeleteOrderButton({ orderId, orderNumber, patientName, summary }: {
  orderId: string
  orderNumber: string
  patientName: string
  summary: string // exámenes, estado y cobro, para que se vea qué se borra
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  const ok = reason.trim().length >= 10

  function confirmDelete() {
    setError("")
    startTransition(async () => {
      const res = await deleteOrder(orderId, reason)
      if (res.error) return setError(res.error)
      removeOpenSample(orderId)
      router.push("/muestras")
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setReason(""); setError(""); setOpen(true) }}
        className="border border-red-300 text-red-700 font-mono text-[10px] tracking-[0.18em] uppercase px-4 py-2.5 hover:bg-red-50 transition-colors"
      >
        Eliminar muestra
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center overflow-y-auto p-4" onClick={() => !pending && setOpen(false)}>
          <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" className="bg-bone border border-red-200 w-full max-w-lg mt-16 p-5 md:p-6">
            <p className="font-mono text-[9px] tracking-[0.22em] text-red-700 uppercase">Eliminar muestra</p>
            <h2 className="font-serif text-[22px] font-medium tracking-[-0.01em] mt-1">
              {patientName} <span className="font-mono text-sm text-ink-2">· {orderNumber}</span>
            </h2>
            <p className="font-sans text-sm text-ink mt-3">
              Se borran la orden, sus exámenes, resultados, PDFs y fotos. <strong>No se puede deshacer.</strong> Queda un registro
              con tu nombre, la fecha, el motivo y una copia de los datos en <em>Muestras eliminadas</em>.
            </p>
            <p className="font-sans text-xs text-ink-2 bg-white border border-black/[0.06] px-3 py-2 mt-3">{summary}</p>

            <label className="block font-mono text-[9px] tracking-[0.18em] uppercase text-salvia-700 mt-4 mb-1.5">
              ¿Por qué se elimina? *
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={4}
              autoFocus
              placeholder="Ej. Muestra duplicada: se registró dos veces la misma solicitud (la correcta es la 2026-00051)."
              className="w-full border border-black/20 bg-white px-3 py-2 text-sm font-sans resize-y focus:outline-2 focus:outline-red-600"
            />
            {!ok && reason.length > 0 && <p className="font-sans text-[11px] text-ink-2 mt-1">Explica un poco más (mínimo 10 caracteres).</p>}
            {error && <p className="font-sans text-xs text-red-600 mt-2">{error}</p>}

            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={confirmDelete}
                disabled={!ok || pending}
                className="bg-red-700 text-white font-mono text-[10px] tracking-[0.18em] uppercase px-5 py-2.5 hover:bg-red-800 disabled:opacity-40"
              >
                {pending ? "Eliminando…" : "Eliminar definitivamente"}
              </button>
              <button type="button" disabled={pending} onClick={() => setOpen(false)} className="border border-black/15 font-mono text-[10px] tracking-[0.18em] uppercase px-4 py-2.5">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
