import type { Metadata } from "next"
import { prisma } from "@/lib/db"
import CajaTable, { type CajaRow } from "./CajaTable"

export const metadata: Metadata = { title: "Caja" }

export default async function CajaPage() {
  const exams = await prisma.orderExam.findMany({
    orderBy: { createdAt: "desc" },
    include: { order: { include: { clinic: true } }, template: true },
  })

  const rows: CajaRow[] = exams.map(e => ({
    id: e.id,
    orderNumber: e.order.orderNumber,
    patientName: e.order.patientName,
    clinicName: e.order.clinic?.name ?? "—",
    templateName: e.template.name,
    price: e.price,
    discountType: e.discountType,
    discountValue: e.discountValue,
    paymentTerm: e.paymentTerm,
    paymentMethod: e.paymentMethod,
    amountPaid: e.amountPaid,
  }))

  return (
    <div className="px-8 py-8 max-w-6xl">
      <div className="mb-6">
        <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Caja</p>
        <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">Cobro de exámenes</h1>
        <p className="font-sans text-sm text-ink-2 mt-2 max-w-2xl">
          Precio, descuento y forma de pago de cada examen. El estado de pago que se ve en
          la orden y en el listado de muestras se calcula automáticamente desde esta tabla.
        </p>
      </div>

      <CajaTable initialRows={rows} />
    </div>
  )
}
