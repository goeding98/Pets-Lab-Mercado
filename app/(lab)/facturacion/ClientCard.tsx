"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { markInvoiced, unmarkInvoiced } from "@/actions/invoicing"
import { formatCOP } from "@/lib/payment"
import type { InvoiceClient } from "@/lib/invoicing"

// Un cliente en Facturación: sus datos (para la factura), el resumen y sus órdenes con el detalle de
// exámenes. Se eligen órdenes y se marcan como facturadas con el número de factura.
export default function ClientCard({ client, defaultOpen }: { client: InvoiceClient; defaultOpen: boolean }) {
  const router = useRouter()
  const pendingIds = client.orders.filter(o => !o.invoiceNumber).map(o => o.id)
  const [open, setOpen] = useState(defaultOpen)
  const [selected, setSelected] = useState<string[]>(pendingIds)
  const [invoice, setInvoice] = useState("")
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()
  const selTotal = client.orders.filter(o => selected.includes(o.id)).reduce((n, o) => n + o.total, 0)

  const toggle = (id: string) => setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))

  function mark() {
    setError("")
    startTransition(async () => {
      const res = await markInvoiced(selected, invoice)
      if (res.error) return setError(res.error)
      setInvoice("")
      router.refresh()
    })
  }
  function undo(id: string, num: string) {
    if (!confirm(`¿Quitar la factura ${num} de esta orden? Vuelve a "por facturar".`)) return
    startTransition(async () => { await unmarkInvoiced(id); router.refresh() })
  }

  const info: [string, string | null][] = [
    ["NIT / Cédula", client.nit], ["Teléfono", client.phone], ["Correo", client.email], ["Dirección", client.address],
    ...(client.contactName && !client.isParticular ? [["Contacto", client.contactName] as [string, string]] : []),
  ]

  return (
    <section className="bg-white border border-black/[0.08]">
      <button type="button" onClick={() => setOpen(o => !o)} className="w-full text-left px-4 md:px-5 py-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-base font-semibold text-ink">
            {client.name}
            {client.isParticular && <span className="ml-2 font-mono text-[8px] tracking-[0.15em] uppercase bg-amber-100 text-amber-900 px-1.5 py-0.5 align-middle">Particular</span>}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-0.5 mt-2">
            {info.map(([l, v]) => (
              <p key={l} className="font-sans text-xs">
                <span className="text-ink-2">{l}: </span>
                <span className={v ? "text-ink" : "text-red-600"}>{v ?? "sin registrar"}</span>
              </p>
            ))}
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="font-serif text-[24px] font-medium tracking-[-0.02em] text-ink leading-tight">{formatCOP(client.total)}</p>
          <p className="font-sans text-[11px] text-ink-2">
            {client.orders.length} {client.orders.length === 1 ? "orden" : "órdenes"} · pagado {formatCOP(client.paid)}
            {client.balance > 0 && <span className="text-red-700"> · saldo {formatCOP(client.balance)}</span>}
          </p>
          <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-salvia-700 mt-1">{open ? "Ocultar detalle ▲" : "Ver detalle ▼"}</p>
        </div>
      </button>

      {open && (
        <div className="border-t border-black/[0.06] px-4 md:px-5 py-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left border-b border-black/10">
                  <th className="pb-2 pr-2 w-6"></th>
                  {["Orden", "Fecha", "Paciente", "Exámenes", "Valor", "Pagado", "Factura"].map(h => (
                    <th key={h} className={`font-mono text-[8px] tracking-[0.15em] uppercase text-salvia-700 pb-2 pr-3 ${["Valor", "Pagado"].includes(h) ? "text-right" : ""}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {client.orders.map(o => (
                  <tr key={o.id} className="border-b border-black/[0.05] align-top">
                    <td className="py-2 pr-2">
                      {!o.invoiceNumber && (
                        <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} className="accent-salvia-700 mt-0.5" />
                      )}
                    </td>
                    <td className="py-2 pr-3 font-mono text-[10px] whitespace-nowrap">
                      <a href={`/muestras/${o.id}`} target="_blank" className="text-salvia-700 hover:underline">{o.orderNumber}</a>
                      {!o.completed && <span className="block text-[8px] uppercase tracking-[0.1em] text-amber-700">en proceso</span>}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap text-ink-2">{o.date.split("-").reverse().join("/")}</td>
                    <td className="py-2 pr-3">
                      <span className="text-ink">{o.patientName}</span> <span className="text-ink-2">({o.species})</span>
                      {o.ownerName && <span className="block text-[11px] text-ink-2">Tutor: {o.ownerName}</span>}
                      {o.branch && <span className="block text-[10px] text-salvia-700">Sede {o.branch}</span>}
                    </td>
                    <td className="py-2 pr-3">
                      {o.lines.map((l, i) => (
                        <span key={i} className="flex justify-between gap-3">
                          <span className="text-ink">{l.name}</span>
                          <span className="text-ink-2 tabular-nums whitespace-nowrap">
                            {l.discount > 0 && <span className="line-through mr-1">{formatCOP(l.price)}</span>}{formatCOP(l.net)}
                          </span>
                        </span>
                      ))}
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums font-medium whitespace-nowrap">{formatCOP(o.total)}</td>
                    <td className={`py-2 pr-3 text-right tabular-nums whitespace-nowrap ${o.balance > 0 ? "text-red-700" : "text-ink-2"}`}>{formatCOP(o.paid)}</td>
                    <td className="py-2 whitespace-nowrap">
                      {o.invoiceNumber ? (
                        <span className="block">
                          <span className="font-mono text-[10px] bg-salvia-50 text-salvia-800 px-1.5 py-0.5">N° {o.invoiceNumber}</span>
                          <span className="block text-[10px] text-ink-2 mt-0.5">{o.invoicedAt?.split("-").reverse().join("/")} · {o.invoicedByName}</span>
                          <button type="button" onClick={() => undo(o.id, o.invoiceNumber!)} disabled={pending} className="text-[10px] text-red-700 hover:underline">Deshacer</button>
                        </span>
                      ) : <span className="text-amber-700 text-[11px]">Por facturar</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pendingIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-4 bg-salvia-50/60 border border-black/[0.06] px-3 py-3">
              <span className="font-sans text-xs text-ink">
                {selected.length} {selected.length === 1 ? "orden seleccionada" : "órdenes seleccionadas"} · <strong>{formatCOP(selTotal)}</strong>
              </span>
              <input
                value={invoice}
                onChange={e => setInvoice(e.target.value)}
                placeholder="N° de factura (ej. FE-1024)"
                className="border border-black/20 bg-white px-2 py-1.5 text-xs font-sans w-48 ml-auto"
              />
              <button
                type="button"
                onClick={mark}
                disabled={pending || selected.length === 0 || !invoice.trim()}
                className="bg-salvia-700 text-bone font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-2 hover:bg-salvia-800 disabled:opacity-40"
              >
                {pending ? "Guardando…" : "Marcar como facturadas"}
              </button>
              {error && <p className="w-full font-sans text-xs text-red-600">{error}</p>}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
