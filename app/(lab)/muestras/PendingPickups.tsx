// Recogidas pedidas desde el Portal Vet que faltan por recoger (lib/pickups.ts), arriba de /muestras: la más urgente
// primero, con la hora límite de la garantía. Las marca el personal o el domiciliario (permiso muestras.crear).
import Link from "next/link"
import { prisma } from "@/lib/db"
import { formatTime } from "@/lib/dates"
import Countdown from "@/app/(web)/portal-vet/dashboard/Countdown"
import PickupButtons from "./PickupButtons"

export default async function PendingPickups({ canMark }: { canMark: boolean }) {
  const pickups = await prisma.pickup.findMany({
    where: { status: "PENDIENTE", orders: { some: {} } },
    include: {
      clinic: { select: { name: true, phone: true, address: true } },
      branch: { select: { name: true, address: true, neighborhood: true, phone: true } },
      orders: { select: { id: true, orderNumber: true, patientName: true, exams: { select: { template: { select: { name: true } } } } } },
    },
  })
  if (pickups.length === 0) return null
  // Primero las que vencen antes; las que no tienen garantía, al final
  pickups.sort((a, b) => (a.deadline?.getTime() ?? Infinity) - (b.deadline?.getTime() ?? Infinity))

  return (
    <section className="mb-6 border border-amber-300 bg-amber-50/60">
      <header className="px-4 py-2.5 border-b border-amber-200 flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-[9px] tracking-[0.22em] uppercase text-amber-900">Recogidas pedidas por el Portal Vet ({pickups.length})</p>
        <p className="font-sans text-[11px] text-ink-2">Garantía: 1 h 30 desde que la clínica pide. Tarde = 50 % en lo recogido.</p>
      </header>
      <div className="divide-y divide-amber-200">
        {pickups.map(p => {
          const addr = p.branch ? [p.branch.address, p.branch.neighborhood].filter(Boolean).join(", ") : p.clinic.address
          const phone = p.branch?.phone || p.clinic.phone
          return (
            <div key={p.id} className="px-4 py-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="min-w-0">
                <p className="font-sans text-sm font-medium text-ink">
                  {p.clinic.name}{p.branch && <span className="font-normal text-ink-2"> · Sede {p.branch.name}</span>}
                </p>
                <p className="font-sans text-xs text-ink-2">{[addr, phone && `Tel. ${phone}`].filter(Boolean).join(" · ")}</p>
                <ul className="mt-1 font-sans text-xs text-ink">
                  {p.orders.map(o => (
                    <li key={o.id}>
                      <Link href={`/muestras/${o.id}`} className="font-mono text-[10px] text-salvia-700 hover:underline mr-1.5">{o.orderNumber}</Link>
                      {o.patientName}: {o.exams.map(e => e.template.name).join(", ")}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid gap-1.5 md:justify-items-end">
                <p className="font-sans text-xs text-ink">
                  Pedida {formatTime(p.createdAt)}
                  {p.deadline
                    ? <> · antes de las <b>{formatTime(p.deadline)}</b> (<Countdown deadline={p.deadline.toISOString()} />)</>
                    : <> · sin garantía (fuera de horario)</>}
                </p>
                {canMark && <PickupButtons pickupId={p.id} />}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
