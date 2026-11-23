// Datos del plan de mensajeros (/clientes/mensajeros): sedes ubicadas en el mapa + muestras de los últimos 30 días.
// Lo usan la página y el PDF de instrucciones, para que los dos muestren exactamente el mismo plan.
import { prisma } from "@/lib/db"

export type SedePunto = { id: string; name: string; address: string; phone: string; lat: number; lng: number; m: number; own: boolean }

// Laboratorio: sede de Pets & Pets en Colseguros (Calle 10 #31-143). Si no se encuentra ubicada, estas coordenadas.
const LAB_FALLBACK = { lat: 3.4307, lng: -76.5417 }

export async function loadMessengerData() {
  const since = new Date(Date.now() - 30 * 86400_000)
  const [branches, recent] = await Promise.all([
    prisma.clinicBranch.findMany({
      where: { lat: { not: null }, lng: { not: null } },
      include: { clinic: { select: { name: true, noCharge: true, phone: true } } },
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
      phone: b.phone || b.clinic.phone || "",
      lat: b.lat!,
      lng: b.lng!,
      m: count(b.id),
      own: b.clinic.noCharge,
    }))

  return { lab, labLocated: !!labBranch, points }
}
