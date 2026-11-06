import type { Metadata } from "next"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { bogotaDay, discountStatus } from "@/lib/discounts"
import { ensureLoyaltyClosed, monthName, tierByKey } from "@/lib/loyalty"
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
export default async function DescuentosPage({ searchParams }: { searchParams: { tipo?: string; estado?: string } }) {
  const today = bogotaDay()
  await ensureLoyaltyClosed().catch(() => []) // crea los del Club Pets & Lab si cerró un corte
  const [discounts, clinics, areas] = await Promise.all([
    prisma.clinicDiscount.findMany({ orderBy: [{ endDate: "desc" }, { createdAt: "desc" }], include: { clinic: { select: { name: true } } } }),
    prisma.clinic.findMany({ where: { noCharge: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.examTemplate.groupBy({ by: ["area"], where: { active: true, isCustom: false }, _count: true, orderBy: { area: "asc" } }),
  ])
  const order = { vigente: 0, programado: 1, vencido: 2 }
  const all = discounts
    .map(d => ({ ...d, status: discountStatus(d, today), auto: d.source === "LEALTAD" }))
    .sort((a, b) => order[a.status] - order[b.status])
  const tipo = searchParams.tipo === "auto" || searchParams.tipo === "manual" ? searchParams.tipo : "todos"
  const estado = searchParams.estado === "vigente" || searchParams.estado === "programado" || searchParams.estado === "vencido" ? searchParams.estado : "todos"
  const rows = all.filter(d => (tipo === "todos" || d.auto === (tipo === "auto")) && (estado === "todos" || d.status === estado))
  const link = (k: string, v: string) => {
    const q = new URLSearchParams({ tipo, estado, [k]: v })
    for (const key of ["tipo", "estado"]) if (q.get(key) === "todos") q.delete(key)
    const s = q.toString()
    return s ? `/descuentos?${s}` : "/descuentos"
  }
  const chip = (on: boolean) => `font-sans text-[13px] px-3 py-1.5 border transition-colors ${on ? "bg-salvia-700 border-salvia-700 text-bone" : "bg-white border-black/20 text-ink hover:border-salvia-700"}`

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
        <div className="grid grid-cols-3 gap-3 mb-4">
          {([
            ["Vigentes hoy", all.filter(d => d.status === "vigente").length],
            ["⚡ Automáticos vigentes", all.filter(d => d.auto && d.status === "vigente").length],
            ["Programados", all.filter(d => d.status === "programado").length],
          ] as const).map(([l, v]) => (
            <div key={l} className="border border-black/10 bg-white px-3 py-2.5">
              <p className="font-mono text-[8px] tracking-[0.15em] uppercase text-ink-2">{l}</p>
              <p className="font-serif text-[24px] leading-tight font-medium text-ink">{v}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {([["todos", "Todos"], ["auto", "⚡ Automáticos (lealtad)"], ["manual", "Manuales"]] as const).map(([v, l]) => (
            <Link key={v} href={link("tipo", v)} className={chip(tipo === v)}>{l}</Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {([["todos", "Cualquier estado"], ["vigente", "Vigentes"], ["programado", "Programados"], ["vencido", "Vencidos"]] as const).map(([v, l]) => (
            <Link key={v} href={link("estado", v)} className={chip(estado === v)}>{l}</Link>
          ))}
        </div>
        <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-3">Descuentos ({rows.length})</p>
        {rows.length === 0 ? (
          <p className="font-sans text-sm text-ink-2 border border-black/10 bg-salvia-50 px-4 py-6 text-center">
            {all.length === 0 ? "Aún no hay descuentos. Crea el primero abajo." : "Ningún descuento con este filtro."}
          </p>
        ) : (
          <div className="border border-black/10 divide-y divide-black/[0.06]">
            {rows.map(d => {
              const t = d.auto ? tierByKey(d.loyaltyTier) : null
              return (
              <div key={d.id} className={`px-4 py-3.5 flex items-start gap-4 ${d.status === "vencido" ? "opacity-60" : ""}`}
                style={{ background: t ? `linear-gradient(90deg, ${t.soft} 0%, #ffffff 55%)` : "#ffffff", borderLeft: t ? `3px solid ${t.color}` : undefined }}>
                <p className="font-serif text-[24px] leading-none font-medium text-ink w-16 shrink-0 pt-0.5">{d.percent}%</p>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm font-medium text-ink">
                    {d.clinic.name}
                    <span className={`ml-2 font-mono text-[8px] tracking-[0.15em] uppercase px-1.5 py-0.5 align-middle ${STATUS[d.status].cls}`}>{STATUS[d.status].label}</span>
                    {d.auto && (
                      <span className="ml-1.5 font-mono text-[8px] tracking-[0.15em] uppercase px-1.5 py-0.5 align-middle text-white" style={{ background: t?.color ?? "#2f5d50" }}>
                        ⚡ Automático · Lealtad {t?.name ?? ""}
                      </span>
                    )}
                  </p>
                  <p className="font-sans text-xs text-ink-2 mt-0.5">
                    {d.areas.length === 0 ? "Todos los exámenes" : d.areas.join(", ")} · del {fmt(d.startDate)} al {fmt(d.endDate)}
                  </p>
                  {d.note && <p className="font-sans text-xs text-ink mt-0.5">{d.note}</p>}
                  {d.auto ? (
                    <p className="font-mono text-[8px] tracking-[0.12em] uppercase mt-1" style={{ color: t?.color }}>
                      Generado automáticamente por el Club Pets &amp; Lab{d.loyaltyPeriod ? ` · ganado en ${monthName(d.loyaltyPeriod)}` : ""}{d.loyaltyCount != null ? ` · ${d.loyaltyCount} pacientes` : ""} ·{" "}
                      <Link href="/lealtad" className="underline">ver programa</Link>
                    </p>
                  ) : (
                    d.createdByName && <p className="font-mono text-[8px] tracking-[0.12em] text-ink-2 uppercase mt-1">Creado por {d.createdByName}</p>
                  )}
                </div>
                <DeleteDiscountButton id={d.id} label={`${d.percent}% de ${d.clinic.name}`} />
              </div>
              )
            })}
          </div>
        )}
      </section>

      <NewDiscountForm clinics={clinics} areas={areas.map(a => a.area)} today={today} />
    </div>
  )
}
