import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/db"
import MessengerMap, { type SedePunto } from "./MessengerMap"

export const metadata: Metadata = { title: "Plan de mensajeros" }
export const dynamic = "force-dynamic"

// Laboratorio: sede de Pets & Pets en Colseguros (Calle 10 #31-143). Si no se encuentra ubicada, estas coordenadas.
const LAB_FALLBACK = { lat: 3.4307, lng: -76.5417 }

// Plan de mensajeros (permiso "mensajeros": solo ADMIN). Rutas fijas para las sedes que más muestras mandan,
// calculadas en el navegador con lib/messengerRoutes.ts sobre las muestras de los últimos 30 días.
export default async function MensajerosPage() {
  const since = new Date(Date.now() - 30 * 86400_000)
  const [branches, recent] = await Promise.all([
    prisma.clinicBranch.findMany({
      where: { lat: { not: null }, lng: { not: null } },
      include: { clinic: { select: { name: true, noCharge: true } } },
    }),
    // Muestras = órdenes registradas en 30 días; las SOLICITADA del portal aún no tienen muestra.
    prisma.order.groupBy({ by: ["branchId"], where: { createdAt: { gte: since }, status: { not: "SOLICITADA" } }, _count: true }),
  ])
  const count = (id: string) => recent.find(r => r.branchId === id)?._count ?? 0

  const labBranch = branches.find(
    b => b.clinic.noCharge && (/colseguros/i.test(b.name) || /colseguros/i.test(b.neighborhood ?? "") || /31\s*-\s*143/.test(b.address)),
  )
  const lab = labBranch ? { lat: labBranch.lat!, lng: labBranch.lng! } : LAB_FALLBACK

  const points: SedePunto[] = branches
    .filter(b => b.id !== labBranch?.id)
    .map(b => ({
      id: b.id,
      name: b.clinic.noCharge ? `${b.clinic.name} · ${b.name}` : b.clinic.name + (b.name && !/principal/i.test(b.name) ? ` · ${b.name}` : ""),
      address: [b.address, b.neighborhood].filter(Boolean).join(", "),
      lat: b.lat!,
      lng: b.lng!,
      m: count(b.id),
      own: b.clinic.noCharge,
    }))

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Administración</p>
          <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">Plan de mensajeros</h1>
          <p className="font-sans text-sm text-ink-2 mt-1">
            Rutas fijas según las muestras de los últimos 30 días · {points.filter(p => p.m > 0).length} sedes con muestras
            {!labBranch && " · laboratorio sin ubicar en el mapa (se usa la dirección de Colseguros)"}
          </p>
        </div>
        <Link href="/clientes/mapa" className="font-mono text-[9px] tracking-[0.15em] text-salvia-700 hover:underline uppercase mt-2">
          ← Mapa de clientes
        </Link>
      </div>
      <MessengerMap lab={lab} points={points} />
    </div>
  )
}
