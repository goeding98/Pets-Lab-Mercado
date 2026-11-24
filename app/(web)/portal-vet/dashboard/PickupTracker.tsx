// Seguimiento de las recogidas de la clínica en el Portal Vet (lib/pickups.ts): las pendientes y las de las últimas
// 12 horas, cada una con sus pasos (pedida → recogida → en el laboratorio → resultado listo) y la garantía.
import { prisma } from "@/lib/db"
import { formatTime } from "@/lib/dates"
import { DESCUENTO_TARDE, ESPERA_MIN } from "@/lib/pickups"
import { computeNetPrice } from "@/lib/billing"
import { formatCOP } from "@/lib/payment"
import Countdown from "./Countdown"
import RequestAgainButton from "./RequestAgainButton"

const RECIBIDA_O_MAS = ["RECIBIDA", "EN_PROCESO", "COMPLETADA"]

export default async function PickupTracker({ clinicId, sede }: { clinicId: string; sede?: string }) {
  const since = new Date(Date.now() - 12 * 3600_000)
  // Sin órdenes = recogida "no estaba lista" cuyas muestras pasaron a una recogida nueva: no se muestra
  const pickups = await prisma.pickup.findMany({
    where: { clinicId, ...(sede ? { branchId: sede } : {}), orders: { some: {} }, OR: [{ status: "PENDIENTE" }, { createdAt: { gte: since } }] },
    orderBy: { createdAt: "desc" },
    take: 6,
    include: {
      branch: { select: { name: true } },
      orders: { select: { id: true, orderNumber: true, patientName: true, status: true, exams: { select: { price: true, discountType: true, discountValue: true } } } },
    },
  })
  if (pickups.length === 0) return null

  return (
    <section className="mb-8">
      <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-2">Recogidas</p>
      <div className="grid gap-3 md:grid-cols-2">
        {pickups.map(p => {
          const inLab = p.orders.length > 0 && p.orders.every(o => RECIBIDA_O_MAS.includes(o.status))
          const ready = p.orders.length > 0 && p.orders.every(o => o.status === "COMPLETADA")
          const notReady = p.status === "NO_LISTA"
          const stillWaiting = notReady && p.orders.some(o => o.status === "SOLICITADA")
          const steps = [
            { label: "Pedida", time: formatTime(p.createdAt), done: true },
            notReady
              ? { label: "No estaba lista", time: p.pickedAt ? formatTime(p.pickedAt) : "", done: true, warn: true }
              : { label: p.late ? "Recogida tarde" : "Recogida", time: p.pickedAt ? formatTime(p.pickedAt) : "", done: p.status === "RECOGIDA", warn: p.late },
            { label: "En el laboratorio", time: "", done: inLab },
            { label: "Resultado listo", time: "", done: ready },
          ]
          const current = steps.findIndex(s => !s.done)
          const saved = p.late
            ? p.orders.flatMap(o => o.exams).reduce((n, e) => n + e.price - computeNetPrice(e.price, e.discountType, e.discountValue), 0)
            : 0
          return (
            <article key={p.id} className="border border-black/[0.08] bg-white">
              <header className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 border-b border-black/[0.06]">
                <span className="font-sans text-sm font-medium">
                  {p.orders.length} {p.orders.length === 1 ? "muestra" : "muestras"}
                  <span className="font-normal text-ink-2"> · {p.orders.map(o => o.patientName).join(", ")}</span>
                </span>
                {p.branch && <span className="font-mono text-[8px] tracking-[0.12em] uppercase text-salvia-700">Sede {p.branch.name}</span>}
              </header>

              {p.status === "PENDIENTE" && (
                p.deadline ? (
                  <div className="mx-4 mt-3 px-3 py-2 bg-salvia-50 font-sans text-[13px] flex flex-wrap justify-between gap-2">
                    <span>Recogemos antes de las <b>{formatTime(p.deadline)}</b></span>
                    <Countdown deadline={p.deadline.toISOString()} />
                  </div>
                ) : (
                  <div className="mx-4 mt-3 px-3 py-2 bg-black/[0.04] font-sans text-[13px] text-ink-2">
                    Pedida fuera del horario de garantía: la recogemos en la siguiente vuelta.
                  </div>
                )
              )}
              {p.late && (
                <div className="mx-4 mt-3 px-3 py-2 bg-red-50 border border-red-200 font-sans text-[13px] text-red-800">
                  Llegamos tarde: {DESCUENTO_TARDE} % de descuento en esta recogida{saved > 0 ? ` (−${formatCOP(saved)})` : ""}.
                </div>
              )}

              <ol className="px-4 py-3 grid grid-cols-4 gap-2">
                {steps.map((s, i) => (
                  <li key={s.label} className="min-w-0">
                    <span className={`block h-1.5 mb-1.5 ${s.done ? (s.warn ? "bg-amber-500" : "bg-salvia-700") : i === current ? "bg-salvia-300" : "bg-black/10"}`} />
                    <span className={`block font-sans text-[12px] leading-tight ${s.done || i === current ? "text-ink" : "text-ink-2"} ${i === current ? "font-medium" : ""}`}>{s.label}</span>
                    {s.time && <span className="block font-mono text-[10px] text-ink-2 mt-0.5">{s.time}</span>}
                  </li>
                ))}
              </ol>

              {stillWaiting && (
                <div className="px-4 pb-4 grid gap-2">
                  <p className="font-sans text-[13px] text-ink-2">
                    El mensajero pasó y la muestra no estaba lista. Cuando la tengas, pide la recogida de nuevo
                    (desde las {formatTime(new Date(p.createdAt.getTime() + ESPERA_MIN * 60000))}).
                  </p>
                  <RequestAgainButton branchId={p.branchId} />
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
