import type { Metadata } from "next"
import { prisma } from "@/lib/db"
import NewCustomExamForm from "./NewCustomExamForm"
import ClientsEditor from "./ClientsEditor"
import DeletePromotionButton from "../promociones/DeletePromotionButton"
import PromotionPriceEditor from "../promociones/PromotionPriceEditor"

export const metadata: Metadata = { title: "Exámenes personalizados" }

export default async function PersonalizadosPage() {
  const [customs, templates, clinics, areaRows] = await Promise.all([
    prisma.examTemplate.findMany({
      where: { isCustom: true, active: true },
      orderBy: { name: "asc" },
      include: {
        clients: { select: { id: true, name: true }, orderBy: { name: "asc" } },
        promoComponents: { orderBy: { order: "asc" }, include: { template: { select: { name: true } } } },
        _count: { select: { orderExams: true } },
      },
    }),
    // Componentes posibles: exámenes simples (los perfiles ya son sumas de exámenes)
    prisma.examTemplate.findMany({
      where: { active: true, isPromotion: false, isCustom: false, NOT: { area: "Perfiles" } },
      orderBy: [{ area: "asc" }, { name: "asc" }],
      select: { id: true, name: true, area: true, turnaround: true, sampleType: true, price: true },
    }),
    prisma.clinic.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.examTemplate.findMany({ where: { active: true }, select: { area: true }, distinct: ["area"] }),
  ])
  const areas = Array.from(new Set(["Perfiles", ...areaRows.map(a => a.area).filter(a => a !== "Promociones")]))

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl">
      <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Catálogo</p>
      <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">Exámenes personalizados</h1>
      <p className="font-sans text-sm text-ink-2 mt-2 mb-8 max-w-2xl">
        Un examen hecho a la medida de uno o varios clientes: tú eliges el nombre, la categoría, los exámenes
        que incluye y el precio. Solo les aparece a esos clientes (en su Portal Vet y en Nueva muestra al elegir
        su clínica); no sale en la página pública ni a otros clientes.
      </p>

      <section className="mb-10">
        <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-3">
          Personalizados activos ({customs.length})
        </p>
        {customs.length === 0 ? (
          <p className="font-sans text-sm text-ink-2 border border-black/10 bg-salvia-50 px-4 py-6 text-center">
            Aún no hay exámenes personalizados. Crea el primero abajo.
          </p>
        ) : (
          <div className="border border-black/10 divide-y divide-black/[0.06]">
            {customs.map(c => (
              <div key={c.id} className="px-4 py-3.5 flex flex-wrap items-start gap-4 bg-white">
                <div className="flex-1 min-w-[220px]">
                  <p className="font-sans text-sm font-medium text-ink">
                    {c.name}
                    <span className="ml-2 font-mono text-[8px] tracking-[0.15em] uppercase text-salvia-700">{c.area}</span>
                  </p>
                  <p className="font-sans text-xs text-ink-2 mt-0.5">
                    {c.promoComponents.map(pc => pc.template.name).join(" + ")}
                  </p>
                  <ClientsEditor id={c.id} selected={c.clients} clinics={clinics} />
                  <p className="font-mono text-[8px] tracking-[0.12em] text-ink-2 uppercase mt-1">
                    {c.turnaround} · {c.sampleType}
                    {c._count.orderExams > 0 && <> · Usado en {c._count.orderExams} {c._count.orderExams === 1 ? "orden" : "órdenes"}</>}
                  </p>
                </div>
                <PromotionPriceEditor id={c.id} price={c.price} />
                <DeletePromotionButton id={c.id} name={c.name} used={c._count.orderExams > 0} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-3">Nuevo examen personalizado</p>
        <NewCustomExamForm templates={templates} clinics={clinics} areas={areas} />
      </section>
    </div>
  )
}
