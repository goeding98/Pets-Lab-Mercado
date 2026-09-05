"use client"
import { useMemo, useState, useTransition } from "react"
import { updateBilling } from "@/actions/billing"
import { computeDiscountAmount, computeNetPrice, getPaymentStatus } from "@/lib/billing"

export type CajaRow = {
  id: string
  orderNumber: string
  patientName: string
  clinicName: string
  templateName: string
  price: number
  discountType: string
  discountValue: number
  paymentTerm: string
  paymentMethod: string
  amountPaid: number
}

function money(n: number) {
  return n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
}

export default function CajaTable({ initialRows }: { initialRows: CajaRow[] }) {
  const [rows, setRows] = useState(initialRows)
  const [, startTransition] = useTransition()

  function patch(id: string, fields: Partial<CajaRow>) {
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...fields } : r)))
  }

  function commit(id: string, fields: Partial<CajaRow>) {
    startTransition(() => {
      updateBilling(id, fields)
    })
  }

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => {
          const discount = computeDiscountAmount(r.price, r.discountType, r.discountValue)
          const net = computeNetPrice(r.price, r.discountType, r.discountValue)
          acc.price += r.price
          acc.discount += discount
          acc.net += net
          acc.paid += r.amountPaid
          return acc
        },
        { price: 0, discount: 0, net: 0, paid: 0 }
      ),
    [rows]
  )

  return (
    <div className="border border-black/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-salvia-50 border-b border-black/10">
              {["N° Orden", "Paciente", "Clínica", "Examen", "Precio", "Descuento", "Precio neto", "Condición", "Pago", "Valor pagado", "Estado"].map(h => (
                <th key={h} className="text-left px-3 py-2.5 font-mono text-[8px] tracking-[0.15em] uppercase text-salvia-700 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const discountAmount = computeDiscountAmount(r.price, r.discountType, r.discountValue)
              const net = computeNetPrice(r.price, r.discountType, r.discountValue)
              const status = getPaymentStatus(net, r.amountPaid)

              return (
                <tr key={r.id} className={`border-b border-black/[0.06] ${i % 2 !== 0 ? "bg-black/[0.015]" : ""}`}>
                  <td className="px-3 py-2 font-mono text-[11px] text-salvia-700 whitespace-nowrap">{r.orderNumber}</td>
                  <td className="px-3 py-2 font-sans text-xs whitespace-nowrap">{r.patientName}</td>
                  <td className="px-3 py-2 font-sans text-xs text-ink-2 whitespace-nowrap">{r.clinicName}</td>
                  <td className="px-3 py-2 font-sans text-xs text-ink-2 whitespace-nowrap">{r.templateName}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={r.price}
                      onChange={e => patch(r.id, { price: Number(e.target.value) })}
                      onBlur={() => commit(r.id, { price: r.price })}
                      className="w-24 border border-black/20 bg-white px-2 py-1 text-xs font-mono focus:outline-salvia-700"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={r.discountValue}
                        onChange={e => patch(r.id, { discountValue: Number(e.target.value) })}
                        onBlur={() => commit(r.id, { discountValue: r.discountValue })}
                        className="w-16 border border-black/20 bg-white px-2 py-1 text-xs font-mono focus:outline-salvia-700"
                      />
                      <select
                        value={r.discountType}
                        onChange={e => {
                          patch(r.id, { discountType: e.target.value })
                          commit(r.id, { discountType: e.target.value })
                        }}
                        className="border border-black/20 bg-white px-1 py-1 text-[10px] font-mono focus:outline-salvia-700"
                      >
                        <option value="VALOR">$</option>
                        <option value="PORCENTAJE">%</option>
                      </select>
                    </div>
                    {discountAmount > 0 && (
                      <span className="block font-mono text-[9px] text-ink-2 mt-0.5">−{money(discountAmount)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs font-medium whitespace-nowrap">{money(net)}</td>
                  <td className="px-3 py-2">
                    <select
                      value={r.paymentTerm}
                      onChange={e => {
                        patch(r.id, { paymentTerm: e.target.value })
                        commit(r.id, { paymentTerm: e.target.value })
                      }}
                      className="border border-black/20 bg-white px-2 py-1 text-xs font-sans focus:outline-salvia-700"
                    >
                      <option value="CONTADO">Contado</option>
                      <option value="CREDITO">Crédito</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={r.paymentMethod}
                      onChange={e => {
                        patch(r.id, { paymentMethod: e.target.value })
                        commit(r.id, { paymentMethod: e.target.value })
                      }}
                      className="border border-black/20 bg-white px-2 py-1 text-xs font-sans focus:outline-salvia-700"
                    >
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={r.amountPaid}
                      onChange={e => patch(r.id, { amountPaid: Number(e.target.value) })}
                      onBlur={() => commit(r.id, { amountPaid: r.amountPaid })}
                      className="w-24 border border-black/20 bg-white px-2 py-1 text-xs font-mono focus:outline-salvia-700"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span className={`font-mono text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 whitespace-nowrap ${status.className}`}>
                      {status.label}
                    </span>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center font-sans text-xs text-ink-2">
                  No hay exámenes registrados todavía.
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-salvia-50 border-t-2 border-salvia-700">
                <td colSpan={4} className="px-3 py-2.5 font-mono text-[9px] tracking-[0.15em] uppercase text-salvia-700 text-right">
                  Totales
                </td>
                <td className="px-3 py-2.5 font-mono text-xs font-semibold whitespace-nowrap">{money(totals.price)}</td>
                <td className="px-3 py-2.5 font-mono text-xs font-semibold whitespace-nowrap">−{money(totals.discount)}</td>
                <td className="px-3 py-2.5 font-mono text-xs font-semibold whitespace-nowrap">{money(totals.net)}</td>
                <td colSpan={2}></td>
                <td className="px-3 py-2.5 font-mono text-xs font-semibold whitespace-nowrap">{money(totals.paid)}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}
