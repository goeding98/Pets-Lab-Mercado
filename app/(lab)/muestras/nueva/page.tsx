import type { Metadata } from "next"
import { prisma } from "@/lib/db"
import OrderForm from "@/components/OrderForm"
import { createOrder } from "@/actions/orders"
import { bogotaDay } from "@/lib/discounts"

export const metadata: Metadata = { title: "Nueva muestra" }

export const dynamic = "force-dynamic"

export default async function NuevaMuestraPage() {
  const today = bogotaDay()
  const [templates, clinics, discounts] = await Promise.all([
    prisma.examTemplate.findMany({
      where: { active: true },
      orderBy: [{ area: "asc" }, { name: "asc" }],
      include: { clients: { select: { id: true } } },
    }),
    prisma.clinic.findMany({
      orderBy: { name: "asc" },
      include: { branches: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, address: true } } },
    }),
    // Descuentos vigentes hoy: solo para mostrar el total a pagar (el servidor los vuelve a calcular al guardar)
    prisma.clinicDiscount.findMany({ where: { startDate: { lte: today }, endDate: { gte: today } }, select: { clinicId: true, percent: true, areas: true } }),
  ])

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl">
      <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Muestras</p>
      <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1 mb-6">Registrar nueva muestra</h1>
      <OrderForm templates={templates} clinics={clinics} discounts={discounts} action={createOrder} paymentOption />
    </div>
  )
}
