import { formatCOP } from "@/lib/payment"
import { daysBetween, todayKey, type ClinicCredit } from "@/lib/credit"

const fmtDay = (d: string) => d.split("-").reverse().join("/")

// Estado de cuenta a crédito de la clínica (Portal Vet): cupo, lo que debe, lo vencido y cada factura pendiente
export default function CreditStatement({ credit }: { credit: ClinicCredit }) {
  const today = todayKey()
  const line = credit.line?.active ? credit.line : null
  const tiles: [string, string, string?][] = [
    ...(line ? [["Cupo de crédito", formatCOP(line.limit)] as [string, string]] : []),
    ["Saldo por pagar", formatCOP(credit.used), credit.used > 0 ? "text-ink" : undefined],
    ...(line ? [["Disponible", formatCOP(Math.max(line.limit - credit.used, 0))] as [string, string]] : []),
    ["Vencido", formatCOP(credit.overdue), credit.overdue > 0 ? "text-red-700" : undefined],
  ]

  return (
    <section className={`border mb-8 ${credit.inMora ? "border-red-300 bg-red-50/60" : "border-salvia-700/20 bg-salvia-50/60"}`}>
      <header className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4">
        <h2 className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Estado de cuenta · crédito</h2>
        {line && <span className="font-sans text-[12px] text-ink-2">Plazo de pago: {line.termDays} días desde cada factura</span>}
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-5 py-4">
        {tiles.map(([label, value, cls]) => (
          <div key={label}>
            <p className="font-mono text-[8px] tracking-[0.18em] uppercase text-ink-2 mb-0.5">{label}</p>
            <p className={`font-sans text-lg font-medium ${cls ?? "text-ink"}`}>{value}</p>
          </div>
        ))}
      </div>

      {credit.inMora ? (
        <p className="mx-5 mb-4 font-sans text-[13px] text-red-800 bg-white border border-red-200 px-3 py-2">
          Tienes facturas vencidas por {formatCOP(credit.overdue)}. Mientras estén pendientes, los resultados a crédito se
          entregan cuando registremos el pago. Comunícate con el laboratorio.
        </p>
      ) : credit.nextDue ? (
        <p className="mx-5 mb-4 font-sans text-[13px] text-ink">
          Próximo vencimiento: <strong>{fmtDay(credit.nextDue)}</strong>
        </p>
      ) : null}

      {credit.orders.length > 0 && (
        <div className="border-t border-black/[0.06] overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead>
              <tr className="text-left">
                {["Orden", "Paciente", "Factura", "Vence", "Saldo", ""].map(h => (
                  <th key={h} className="px-5 py-2 font-mono text-[8px] tracking-[0.18em] uppercase text-salvia-700 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {credit.orders.map(o => {
                const late = o.due < today
                const left = daysBetween(today, o.due)
                return (
                  <tr key={o.id} className="border-t border-black/[0.05]">
                    <td className="px-5 py-2 font-mono text-[11px] text-salvia-700">{o.orderNumber}</td>
                    <td className="px-5 py-2 font-sans text-[13px]">{o.patientName}</td>
                    <td className="px-5 py-2 font-sans text-[12px] text-ink-2">
                      {o.invoiceNumber && !o.invoiceNumber.startsWith("EMITIENDO") ? `${o.invoiceNumber} · ${fmtDay(o.invoiceDay)}` : "Por facturar"}
                    </td>
                    <td className="px-5 py-2 font-sans text-[13px]">{fmtDay(o.due)}</td>
                    <td className="px-5 py-2 font-sans text-[13px] font-medium">{formatCOP(o.balance)}</td>
                    <td className="px-5 py-2">
                      <span className={`font-mono text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 ${late ? "bg-red-100 text-red-800" : left <= 3 ? "bg-amber-100 text-amber-900" : "bg-black/[0.05] text-ink-2"}`}>
                        {late ? `Vencida hace ${o.daysOverdue} d` : left === 0 ? "Vence hoy" : `Vence en ${left} d`}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
