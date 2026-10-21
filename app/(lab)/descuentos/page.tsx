import type { Metadata } from "next"
import { prisma } from "@/lib/db"
import { bogotaDay, discountStatus } from "@/lib/discounts"
import NewDiscountForm from "./NewDiscountForm"
import DeleteDiscountButton from "./DeleteDiscountButton"

export const metadata: Metadata = { title: "Descuentos" }
export const dynamic = "force-dynamic"

const STATUS = {
  vigente: { label: "Vigente", cls: "bg-salvia-700 text-bone" },
  programado: { label: "Programado", cls: "bg-[#0f5fbd]/10 text-[#0f5fbd]" },
  vencido: { label: "Vencido", cls: "bg-black/[0.06] text-ink-2" },
} as const
const fmt = (d: string) => d.split("-").reverse().join("/")

// Descuentos por cliente (permiso "descuentos": ADMIN y COMERCIAL): % por área de examen y ventana de fechas
export default async function DescuentosPage() {
  const today = bogotaDay()
  const [discounts, clinics, areas] = await Promise.all([
    prisma.clinicDiscount.findMany({ orderBy: [{ endDate: "desc" }, { createdAt: "desc" }], include: { clinic: { select: { name: true } } } }),
    prisma.clinic.findMany({ where: { noCharge: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.examTemplate.groupBy({ by: ["area"], where: { active: true, isCustom: false }, _count: true, orderBy: { area: "asc" } }),
  ])
  const order = { vigente: 0, programado: 1, vencido: 2 }
  const rows = discounts
    .map(d => ({ ...d, status: discountStatus(d, today) }))
    .sort((a, b) => order[a.status] - order[b.status])

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl">
      <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Catálogo</p>
      <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">Descuentos</h1>
      <p className="font-sans text-sm text-ink-2 mt-2 mb-8 max-w-2xl">
        Un descuento es un porcentaje para un cliente, en todos los exámenes o solo en algunas áreas, entre dos fechas.
        Las muestras que se registren para ese cliente en esas fechas (desde Nueva muestra o el Portal Vet) quedan con el
        descuento en Caja automáticamente. Si dos descuentos aplican al mismo examen, se usa el mayor. Crear o eliminar un
        descuento no cambia las muestras ya registradas.
      </p>

      <section className="mb-10">
        <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-3">Descuentos ({rows.length})</p>
        {rows.length === 0 ? (
          <p className="font-sans text-sm text-ink-2 border border-black/10 bg-salvia-50 px-4 py-6 text-center">
            Aún no hay descuentos. Crea el primero abajo.
          </p>
        ) : (
          <div className="border border-black/10 divide-y divide-black/[0.06]">
            {rows.map(d => (
              <div key={d.id} className={`px-4 py-3.5 flex items-start gap-4 bg-white ${d.status === "vencido" ? "opacity-60" : ""}`}>
                <p className="font-serif text-[24px] leading-none font-medium text-ink w-16 shrink-0 pt-0.5">{d.percent}%</p>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm font-medium text-ink">
                    {d.clinic.name}
                    <span className={`ml-2 font-mono text-[8px] tracking-[0.15em] uppercase px-1.5 py-0.5 align-middle ${STATUS[d.status].cls}`}>{STATUS[d.status].label}</span>
                  </p>
                  <p className="font-sans text-xs text-ink-2 mt-0.5">
                    {d.areas.length === 0 ? "Todos los exámenes" : d.areas.join(", ")} · del {fmt(d.startDate)} al {fmt(d.endDate)}
                  </p>
                  {d.note && <p className="font-sans text-xs text-ink mt-0.5">{d.note}</p>}
                  {d.createdByName && <p className="font-mono text-[8px] tracking-[0.12em] text-ink-2 uppercase mt-1">Creado por {d.createdByName}</p>}
                </div>
                <DeleteDiscountButton id={d.id} label={`${d.percent}% de ${d.clinic.name}`} />
              </div>
            ))}
          </div>
        )}
      </section>

      <NewDiscountForm clinics={clinics} areas={areas.map(a => a.area)} today={today} />
    </div>
  )
}
