import type { Metadata } from "next"
import { prisma } from "@/lib/db"
import NewPromotionForm from "./NewPromotionForm"
import DeletePromotionButton from "./DeletePromotionButton"
import PromotionPriceEditor from "./PromotionPriceEditor"

export const metadata: Metadata = { title: "Promociones" }

export default async function PromocionesPage() {
  const [promotions, templates] = await Promise.all([
    prisma.examTemplate.findMany({
      where: { isPromotion: true, isCustom: false, active: true },
      orderBy: { name: "asc" },
      include: {
        promoComponents: { orderBy: { order: "asc" }, include: { template: { select: { name: true } } } },
        _count: { select: { orderExams: true } },
      },
    }),
    prisma.examTemplate.findMany({
      where: { isPromotion: false, isCustom: false, active: true },
      orderBy: [{ area: "asc" }, { name: "asc" }],
      select: { id: true, name: true, area: true, turnaround: true, sampleType: true },
    }),
  ])

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl">
      <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Catálogo</p>
      <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">Promociones</h1>
      <p className="font-sans text-sm text-ink-2 mt-2 mb-8 max-w-2xl">
        Una promoción junta varios exámenes en un solo producto. Queda disponible en Nueva muestra, en el
        Portal Vet y en Caja como un examen más, con todos los campos de los exámenes que la componen. Su
        precio se carga solo en Caja al registrar la orden (y ahí se puede ajustar o descontar).
      </p>

      <section className="mb-10">
        <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-3">
          Promociones activas ({promotions.length})
        </p>
        {promotions.length === 0 ? (
          <p className="font-sans text-sm text-ink-2 border border-black/10 bg-salvia-50 px-4 py-6 text-center">
            Aún no hay promociones. Crea la primera abajo.
          </p>
        ) : (
          <div className="border border-black/10 divide-y divide-black/[0.06]">
            {promotions.map(p => (
              <div key={p.id} className="px-4 py-3.5 flex items-start gap-4 bg-white">
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm font-medium text-ink">{p.name}</p>
                  <p className="font-sans text-xs text-ink-2 mt-0.5">
                    {p.promoComponents.map(c => c.template.name).join(" + ")}
                  </p>
                  <p className="font-mono text-[8px] tracking-[0.12em] text-ink-2 uppercase mt-1">
                    {p.turnaround} · {p.sampleType}
                    {p._count.orderExams > 0 && <> · Usada en {p._count.orderExams} {p._count.orderExams === 1 ? "orden" : "órdenes"}</>}
                  </p>
                </div>
                <PromotionPriceEditor id={p.id} price={p.price} />
                <DeletePromotionButton id={p.id} name={p.name} used={p._count.orderExams > 0} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-3">Nueva promoción</p>
        <NewPromotionForm templates={templates} />
      </section>
    </div>
  )
}
