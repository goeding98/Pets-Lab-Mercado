import type { Metadata } from "next"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import LogoutButton from "./LogoutButton"

export const metadata: Metadata = { title: "Portal Vet" }

const ORDER_STATUS: Record<string, { label: string; className: string }> = {
  SOLICITADA: { label: "Solicitada", className: "bg-black/[0.06] text-ink" },
  RECIBIDA: { label: "Muestra recibida", className: "bg-salvia-50 text-salvia-700" },
  EN_PROCESO: { label: "En proceso", className: "bg-azul-100 text-azul-700" },
  COMPLETADA: { label: "Resultado listo", className: "bg-salvia-700 text-bone" },
}

export default async function PortalVetDashboardPage({
  searchParams,
}: {
  searchParams: { q?: string; enviada?: string; sede?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "CLINIC" || !session.user.clinicId) redirect("/portal-vet")

  const q = searchParams.q?.trim()
  const branches = await prisma.clinicBranch.findMany({
    where: { clinicId: session.user.clinicId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  })
  const sede = branches.some(b => b.id === searchParams.sede) ? searchParams.sede : undefined
  const orders = await prisma.order.findMany({
    where: {
      clinicId: session.user.clinicId,
      ...(sede ? { branchId: sede } : {}),
      ...(q
        ? {
            OR: [
              { patientName: { contains: q, mode: "insensitive" } },
              { ownerName: { contains: q, mode: "insensitive" } },
              { orderNumber: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { exams: { include: { template: { select: { name: true } } } }, branch: { select: { name: true } } },
  })

  // Agrupar por paciente (nombre + especie + dueño); el orden sigue la solicitud más reciente
  const patients = new Map<string, { patientName: string; species: string; ownerName: string | null; orders: typeof orders }>()
  for (const o of orders) {
    const key = [o.patientName, o.species, o.ownerName ?? ""].map(s => s.trim().toLowerCase()).join("|")
    if (!patients.has(key)) patients.set(key, { patientName: o.patientName, species: o.species, ownerName: o.ownerName, orders: [] })
    patients.get(key)!.orders.push(o)
  }

  const totalExams = orders.reduce((n, o) => n + o.exams.length, 0)
  const ready = orders.filter(o => o.status === "COMPLETADA").length

  return (
    <div className="max-w-wrap mx-auto px-6 lg:px-10 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-1">Portal Vet</p>
          <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em]">{session.user.name}</h1>
          <p className="font-mono text-[9px] tracking-[0.15em] text-ink-2 uppercase mt-1">
            {patients.size} pacientes · {totalExams} exámenes · {ready} resultados listos
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/portal-vet/sedes"
            className="border border-salvia-700 text-salvia-700 font-mono text-[10px] tracking-[0.18em] uppercase px-4 py-2.5 hover:bg-salvia-50 transition-colors"
          >
            Mis sedes ({branches.length})
          </Link>
          <Link
            href="/portal-vet/nueva"
            className="bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.18em] uppercase px-5 py-2.5 hover:bg-salvia-800 transition-colors"
          >
            Nueva solicitud +
          </Link>
          <LogoutButton />
        </div>
      </div>

      {searchParams.enviada && (
        <div className="bg-salvia-50 border border-salvia-700/20 px-4 py-3 mb-6 font-sans text-[13px] text-salvia-800">
          Solicitud enviada. El laboratorio la verá de inmediato; el estado cambia a “Muestra recibida”
          cuando llegue la muestra.
        </div>
      )}

      <form method="get" className="flex flex-wrap gap-2 mb-6 max-w-2xl">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar paciente, dueño o N° de orden…"
          className="flex-1 min-w-[200px] border border-black/15 bg-white px-3 py-2 text-sm font-sans focus:outline-none focus:border-salvia-700"
        />
        {branches.length > 1 && (
          <select
            name="sede"
            defaultValue={sede ?? ""}
            className="border border-black/15 bg-white px-3 py-2 text-sm font-sans focus:outline-none focus:border-salvia-700"
          >
            <option value="">Todas las sedes</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        <button type="submit" className="border border-black/15 font-mono text-[9px] tracking-[0.18em] uppercase px-4 hover:bg-black/[0.03]">
          Buscar
        </button>
      </form>

      {patients.size === 0 ? (
        <div className="border border-black/[0.06] bg-salvia-50 py-14 text-center">
          <p className="font-sans text-sm text-ink-2 mb-4">
            {q ? "No hay resultados para esa búsqueda." : "Aún no has solicitado exámenes."}
          </p>
          {!q && (
            <Link href="/portal-vet/nueva" className="font-mono text-[10px] tracking-[0.18em] uppercase text-salvia-700 underline">
              Cargar la primera solicitud →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {Array.from(patients.values()).map(p => (
            <section key={`${p.patientName}-${p.species}-${p.ownerName}`} className="border border-black/[0.08] bg-white">
              <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-5 py-3.5 border-b border-black/[0.06] bg-salvia-50/60">
                <h2 className="font-serif text-[20px] font-medium tracking-[-0.01em]">{p.patientName}</h2>
                <span className="font-sans text-[12px] text-ink-2">
                  {p.species}
                  {p.ownerName && <> · Tutor: {p.ownerName}</>}
                </span>
                <span className="ml-auto font-mono text-[9px] tracking-[0.15em] text-ink-2 uppercase">
                  {p.orders.length} {p.orders.length === 1 ? "solicitud" : "solicitudes"}
                </span>
              </header>

              <div className="divide-y divide-black/[0.06]">
                {p.orders.map(o => {
                  const s = ORDER_STATUS[o.status] ?? { label: o.status, className: "bg-black/10 text-ink" }
                  return (
                    <div key={o.id} className="px-5 py-4 flex flex-wrap items-start gap-x-6 gap-y-3">
                      <div className="w-[130px] shrink-0">
                        <p className="font-mono text-[10px] tracking-[0.15em] text-salvia-700">{o.orderNumber}</p>
                        <p className="font-mono text-[9px] text-ink-2 mt-0.5">
                          {new Date(o.createdAt).toLocaleDateString("es-CO")}
                        </p>
                        {o.branch && (
                          <p className="font-mono text-[8px] tracking-[0.12em] uppercase text-salvia-700 mt-1">Sede {o.branch.name}</p>
                        )}
                      </div>
                      <ul className="flex-1 min-w-[200px] space-y-1">
                        {o.exams.map(e => (
                          <li key={e.id} className="flex items-center gap-2 font-sans text-[13px] text-ink">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${e.status === "COMPLETADO" ? "bg-salvia-500" : "bg-black/20"}`}
                              aria-hidden
                            />
                            {e.template.name}
                            <span className="font-mono text-[8px] tracking-[0.12em] uppercase text-ink-2">
                              {e.status === "COMPLETADO" ? "Listo" : "Pendiente"}
                            </span>
                          </li>
                        ))}
                        {o.requestingVet && (
                          <li className="font-sans text-[11px] text-ink-2 pt-1">Solicita: {o.requestingVet}</li>
                        )}
                      </ul>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`font-mono text-[8px] tracking-[0.18em] uppercase px-2 py-1 ${s.className}`}>
                          {s.label}
                        </span>
                        {o.status === "COMPLETADA" && (
                          <a
                            href={`/api/pdf/${o.id}`}
                            target="_blank"
                            className="font-mono text-[9px] tracking-[0.18em] uppercase bg-salvia-700 text-bone px-3 py-1.5 hover:bg-salvia-800 transition-colors"
                          >
                            PDF →
                          </a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
