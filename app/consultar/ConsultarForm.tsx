"use client"
import { useState, useTransition } from "react"
import { lookupOrder } from "./actions"

type OrderResult = {
  orderNumber: string
  patientName: string
  species: string
  status: string
  createdAt: string
  exams: { name: string; status: string }[]
  canDownload: boolean
  orderId: string
}

const STATUS_LABEL: Record<string, string> = {
  RECIBIDA: "Recibida — en espera de procesamiento",
  EN_PROCESO: "En proceso",
  COMPLETADA: "Completada — resultados disponibles",
}

export default function ConsultarForm() {
  const [result, setResult] = useState<OrderResult | null>(null)
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setResult(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const r = await lookupOrder(fd.get("orderNumber") as string)
      if ("error" in r) {
        setError(r.error ?? "Error desconocido")
      } else {
        setResult(r)
      }
    })
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          name="orderNumber"
          type="text"
          required
          placeholder="Ej. PL-260521-4832"
          className="flex-1 border border-black/20 bg-white px-3 py-2.5 text-sm font-mono focus:outline-2 focus:outline-salvia-700"
        />
        <button
          type="submit"
          disabled={pending}
          className="bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.18em] uppercase px-4 py-2.5 hover:bg-salvia-800 transition-colors disabled:opacity-60"
        >
          {pending ? "…" : "Buscar"}
        </button>
      </form>

      {error && <p className="text-red-600 text-sm font-sans mt-2">{error}</p>}

      {result && (
        <div className="border border-black/10 mt-4">
          <div className="bg-salvia-50 px-4 py-3 border-b border-black/10">
            <p className="font-mono text-[9px] tracking-[0.18em] text-salvia-700 uppercase">{result.orderNumber}</p>
            <p className="font-serif text-[18px] font-medium mt-0.5">{result.patientName} <span className="font-sans text-sm font-normal text-ink-2">({result.species})</span></p>
          </div>
          <div className="px-4 py-3">
            <p className="font-mono text-[8px] tracking-[0.18em] text-salvia-700 uppercase mb-1">Estado</p>
            <p className="font-sans text-sm text-ink">{STATUS_LABEL[result.status] ?? result.status}</p>

            <div className="mt-4 space-y-1">
              <p className="font-mono text-[8px] tracking-[0.18em] text-salvia-700 uppercase mb-2">Exámenes</p>
              {result.exams.map(e => (
                <div key={e.name} className="flex items-center justify-between">
                  <span className="font-sans text-xs">{e.name}</span>
                  <span className={`font-mono text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 ${
                    e.status === "COMPLETADO" ? "bg-salvia-700 text-bone" : "bg-black/10 text-ink"
                  }`}>{e.status === "COMPLETADO" ? "Listo" : "Pendiente"}</span>
                </div>
              ))}
            </div>

            {result.canDownload && (
              <a
                href={`/api/pdf/${result.orderId}`}
                target="_blank"
                className="mt-4 block w-full text-center bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.22em] uppercase px-5 py-3 hover:bg-salvia-800 transition-colors"
              >
                Descargar PDF →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
