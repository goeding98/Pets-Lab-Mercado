"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { addOrderExam, changeOrderExam, removeOrderExam } from "@/actions/orderExams"
import { formatCOP } from "@/lib/payment"

// Corregir los exámenes de la muestra (solo personal): cambiar uno pendiente por otro, quitarlo o
// agregar uno nuevo. El precio sale del catálogo (ver actions/orderExams.ts).

export type CatalogOption = { id: string; name: string; area: string; price: number | null; isCustom: boolean }

function ExamSelect({ options, value, onChange, exclude }: {
  options: CatalogOption[]; value: string; onChange: (v: string) => void; exclude?: string
}) {
  const areas = Array.from(new Set(options.map(o => o.area)))
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="border border-black/20 bg-white px-2 py-1.5 text-xs font-sans w-full sm:w-auto sm:min-w-[320px] max-w-full">
      <option value="">Elegir examen…</option>
      {areas.map(a => (
        <optgroup key={a} label={a}>
          {options.filter(o => o.area === a && o.id !== exclude).map(o => (
            <option key={o.id} value={o.id}>
              {o.isCustom ? "★ " : ""}{o.name} — {o.price != null ? formatCOP(o.price) : "sin precio"}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}

const btn = "font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 disabled:opacity-50"

export function ExamChanger({ examId, templateId, templateName, currentPrice, options, canRemove }: {
  examId: string
  templateId: string
  templateName: string
  currentPrice: number
  options: CatalogOption[]
  canRemove: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [next, setNext] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<"change" | "remove" | null>(null)
  const chosen = options.find(o => o.id === next)

  function run(kind: "change" | "remove", fn: () => Promise<{ error?: string }>) {
    setError("")
    setBusy(kind)
    startTransition(async () => {
      const res = await fn()
      if (res.error) return setError(res.error)
      setOpen(false)
      setNext("")
      router.refresh()
    })
  }

  if (!open) {
    return (
      <div className="flex justify-end gap-3 mb-1.5">
        <button type="button" onClick={() => setOpen(true)} disabled={pending} className="font-mono text-[9px] tracking-[0.15em] uppercase text-salvia-700 hover:underline disabled:opacity-50">
          {pending && busy === "change" ? "Cambiando…" : "Cambiar examen"}
        </button>
        {canRemove && (
          <button type="button" disabled={pending}
            onClick={() => confirm(`¿Quitar "${templateName}" de esta muestra?`) && run("remove", () => removeOrderExam(examId))}
            className="font-mono text-[9px] tracking-[0.15em] uppercase text-red-700 hover:underline disabled:opacity-50">
            {pending && busy === "remove" ? "Quitando…" : "Quitar"}
          </button>
        )}
        {error && <span className="font-sans text-xs text-red-600">{error}</span>}
      </div>
    )
  }

  return (
    <div className="border border-amber-300 bg-amber-50 px-4 py-3 mb-2">
      <p className="font-sans text-xs text-ink mb-2">
        Cambiar <strong>{templateName}</strong> ({formatCOP(currentPrice)}) por:
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <ExamSelect options={options} value={next} onChange={setNext} exclude={templateId} />
        <button type="button" disabled={!next || pending} onClick={() => run("change", () => changeOrderExam(examId, next))}
          className={`${btn} bg-salvia-700 text-bone`}>
          {pending ? "Cambiando…" : "Confirmar cambio"}
        </button>
        <button type="button" disabled={pending} onClick={() => { setOpen(false); setNext(""); setError("") }}
          className={`${btn} border border-black/15`}>
          Cancelar
        </button>
      </div>
      {chosen && (
        <p className="font-sans text-[11px] text-ink-2 mt-2">
          Nuevo precio: <strong className="text-ink">{chosen.price != null ? formatCOP(chosen.price) : "sin precio"}</strong>
          {" "}(precio de lista; el descuento vuelve a 0). Lo ya pagado se conserva y el saldo se recalcula.
        </p>
      )}
      {error && <p className="font-sans text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}

export function AddExam({ orderId, options }: { orderId: string; options: CatalogOption[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [next, setNext] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="border border-dashed border-salvia-700/50 text-salvia-700 font-mono text-[9px] tracking-[0.18em] uppercase px-4 py-2.5 hover:bg-salvia-50 w-full">
        + Agregar examen a la muestra
      </button>
    )
  }
  return (
    <div className="border border-black/10 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <ExamSelect options={options} value={next} onChange={setNext} />
        <button type="button" disabled={!next || pending}
          onClick={() => { setError(""); startTransition(async () => {
            const res = await addOrderExam(orderId, next)
            if (res.error) return setError(res.error)
            setOpen(false); setNext(""); router.refresh()
          }) }}
          className={`${btn} bg-salvia-700 text-bone`}>
          {pending ? "Agregando…" : "Agregar"}
        </button>
        <button type="button" disabled={pending} onClick={() => { setOpen(false); setNext(""); setError("") }} className={`${btn} border border-black/15`}>
          Cancelar
        </button>
      </div>
      {error && <p className="font-sans text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
