import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { loadMessengerData } from "@/lib/messengerData"
import { getManualRoutes, planFor } from "@/lib/manualRoutes"
import { MENSAJEROS } from "@/lib/messengerRoutes"
import RouteBuilder, { type BuilderPoint } from "./RouteBuilder"

export const metadata: Metadata = { title: "Armar mapa · Mensajeros" }
export const dynamic = "force-dynamic"

// "Armar mapa" (permiso rutas.editar: ADMIN y COMERCIAL): rutas de los mensajeros a mano. Lista con TODAS las sedes de
// los clientes (también las que no tienen ubicación: se ubican tocando el mapa).
export default async function ArmarMapaPage() {
  const since = new Date(Date.now() - 30 * 86400_000)
  const [{ lab, points }, manual, branches, recent] = await Promise.all([
    loadMessengerData(),
    getManualRoutes(),
    prisma.clinicBranch.findMany({ include: { clinic: { select: { name: true, noCharge: true } } } }),
    prisma.order.groupBy({ by: ["branchId"], where: { createdAt: { gte: since }, status: { not: "SOLICITADA" } }, _count: true }),
  ])
  const count = (id: string) => recent.find(r => r.branchId === id)?._count ?? 0
  // La sede del laboratorio (Pets & Pets Colseguros, Calle 10 #31-143) no es una parada: misma regla que lib/messengerData.ts
  const isLab = (b: (typeof branches)[number]) =>
    b.clinic.noCharge && (/colseguros/i.test(b.name) || /colseguros/i.test(b.neighborhood ?? "") || /31\s*-\s*143/.test(b.address))
  const list: BuilderPoint[] = branches
    .filter(b => !isLab(b))
    .map(b => ({
      id: b.id,
      name: b.clinic.noCharge || (b.name && !/principal/i.test(b.name) && b.name.trim().toLowerCase() !== b.clinic.name.trim().toLowerCase())
        ? `${b.clinic.name} · ${b.name}` : b.clinic.name,
      address: [b.address, b.neighborhood].filter(Boolean).join(", "),
      lat: b.lat, lng: b.lng, m: count(b.id), own: b.clinic.noCharge,
    }))
    .sort((a, b) => b.m - a.m || a.name.localeCompare(b.name))

  // El mapa que está hoy (armado a mano o automático), para poder arrancar desde ahí
  const plan = planFor(lab, points, manual)
  const current = plan.rutas.map((r, i) => ({ color: MENSAJEROS[i].nombre, stops: r.orden.map(p => p.id) })).filter(r => r.stops.length)

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Mensajeros</p>
          <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">Armar mapa</h1>
          <p className="font-sans text-sm text-ink-2 mt-1 max-w-2xl">
            Elige el mensajero y toca las clínicas en el orden de su ruta (en la lista o en el mapa). Al confirmar, este mapa
            reemplaza al anterior en el Plan de mensajeros, el PDF y el Día a día.
          </p>
        </div>
        <Link href="/clientes/mensajeros" className="font-mono text-[9px] tracking-[0.15em] text-salvia-700 hover:underline uppercase mt-2">
          ← Plan de mensajeros
        </Link>
      </div>
      <RouteBuilder lab={lab} points={list} current={current} colors={MENSAJEROS} />
    </div>
  )
}
