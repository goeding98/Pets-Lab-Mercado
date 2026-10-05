import type { Metadata } from "next"
import { prisma } from "@/lib/db"
import OrderForm from "@/components/OrderForm"
import { createOrder } from "@/actions/orders"

export const metadata: Metadata = { title: "Nueva muestra" }

export default async function NuevaMuestraPage() {
  const [templates, clinics] = await Promise.all([
    prisma.examTemplate.findMany({ where: { active: true }, orderBy: [{ area: "asc" }, { name: "asc" }] }),
    prisma.clinic.findMany({
      orderBy: { name: "asc" },
      include: { branches: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, address: true } } },
    }),
  ])

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl">
      <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Muestras</p>
      <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1 mb-6">Registrar nueva muestra</h1>
      <OrderForm templates={templates} clinics={clinics} action={createOrder} paymentOption />
    </div>
  )
}
