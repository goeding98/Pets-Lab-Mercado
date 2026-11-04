import type { Metadata } from "next"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"
import ClientsMap, { type MapPoint } from "./ClientsMap"
import LocateMissingButton from "./LocateMissingButton"

export const metadata: Metadata = { title: "Mapa de clientes" }
export const dynamic = "force-dynamic"

// Mapa de georreferenciación de clientes: un punto por sede (lat/lng de lib/geocode.ts), tamaño según muestras
// enviadas y color según actividad de los últimos 90 días. Arrastrar un punto lo corrige (clientes.editar).
export default async function ClientesMapaPage() {
  const session = await getServerSession(authOptions)
  const canEdit = can(session?.user.role, "clientes.editar")
  const since = new Date(Date.now() - 90 * 86400_000)
  const [branches, total, recent, noBranch] = await Promise.all([
    prisma.clinicBranch.findMany({ include: { clinic: { select: { id: true, name: true, noCharge: true } } }, orderBy: { createdAt: "asc" } }),
    prisma.order.groupBy({ by: ["branchId"], _count: true }),
    prisma.order.groupBy({ by: ["branchId"], where: { createdAt: { gte: since } }, _count: true }),
    prisma.clinic.findMany({ where: { branches: { none: {} }, name: { not: "." } }, select: { id: true, name: true, address: true } }),
  ])
  const count = (rows: { branchId: string | null; _count: number }[], id: string) => rows.find(r => r.branchId === id)?._count ?? 0

  const points: MapPoint[] = branches.map(b => ({
    id: b.id,
    clinicId: b.clinic.id,
    clinic: b.clinic.name,
    branch: b.name,
    address: [b.address, b.neighborhood, b.city].filter(Boolean).join(", "),
    lat: b.lat,
    lng: b.lng,
    manual: b.geoManual,
    own: b.clinic.noCharge,
    orders: count(total, b.id),
    recent: count(recent, b.id),
  }))
  const located = points.filter(p => p.lat != null)
  const missing = points.filter(p => p.lat == null)
  const active = located.filter(p => p.recent > 0).length

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Administración</p>
          <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">Mapa de clientes</h1>
          <p className="font-sans text-sm text-ink-2 mt-1">
            {located.length} sedes en el mapa · {active} con muestras en los últimos 90 días
            {missing.length > 0 && <> · {missing.length} sin ubicar</>}
          </p>
        </div>
        <Link href="/clientes" className="font-mono text-[9px] tracking-[0.15em] text-salvia-700 hover:underline uppercase mt-2">
          ← Lista de clientes
        </Link>
      </div>

      <ClientsMap points={located} canEdit={canEdit} />

      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 font-sans text-xs text-ink-2">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#2f5d50] inline-block" /> Activo (muestras en 90 días)</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#9aa79f] inline-block" /> Sin muestras recientes</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#c9772b] inline-block" /> Pets &amp; Pets</span>
        <span>Tamaño = muestras enviadas en total.{canEdit && " Si un punto quedó mal, arrástralo a su lugar."}</span>
      </div>

      {(missing.length > 0 || noBranch.length > 0) && (
        <section className="mt-8 max-w-3xl">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Sin ubicar ({missing.length + noBranch.length})</p>
            {canEdit && missing.length > 0 && <LocateMissingButton />}
          </div>
          <div className="border border-black/10 divide-y divide-black/[0.06] bg-white">
            {missing.map(p => (
              <div key={p.id} className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <p className="font-sans text-sm">
                  {p.clinic} <span className="text-ink-2">· {p.branch}</span>
                  <span className="block font-sans text-xs text-ink-2">{p.address || "Sin dirección"}</span>
                </p>
                <Link href={`/clientes/${p.clinicId}`} className="font-mono text-[9px] tracking-[0.15em] text-salvia-700 hover:underline uppercase">Corregir dirección →</Link>
              </div>
            ))}
            {noBranch.map(c => (
              <div key={c.id} className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                <p className="font-sans text-sm">
                  {c.name}
                  <span className="block font-sans text-xs text-ink-2">{c.address ? `${c.address} (sin sede registrada)` : "Sin dirección ni sede"}</span>
                </p>
                <Link href={`/clientes/${c.id}`} className="font-mono text-[9px] tracking-[0.15em] text-salvia-700 hover:underline uppercase">Agregar sede →</Link>
              </div>
            ))}
          </div>
          <p className="font-sans text-[11px] text-ink-2 mt-1.5">
            La ubicación sale de la dirección (cruce de calle y carrera). Si no se encuentra, revisa que la dirección esté
            completa, p. ej. &quot;Calle 10 #31-143&quot;.
          </p>
        </section>
      )}
    </div>
  )
}
