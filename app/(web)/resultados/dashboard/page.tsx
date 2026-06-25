import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import LogoutButton from "./LogoutButton"

export default async function ClinicDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "CLINIC") redirect("/resultados")

  const clinicId = session.user.clinicId!

  const [recibidas, procesadas] = await Promise.all([
    prisma.order.findMany({
      where: { clinicId, status: { in: ["RECIBIDA", "EN_PROCESO"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, orderNumber: true, patientName: true, species: true, status: true, createdAt: true },
    }),
    prisma.order.findMany({
      where: { clinicId, status: "COMPLETADA" },
      orderBy: { updatedAt: "desc" },
      take: 20,
      select: { id: true, orderNumber: true, patientName: true, species: true, updatedAt: true },
    }),
  ])

  return (
    <div className="max-w-wrap mx-auto px-6 lg:px-10 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-1">Portal de resultados</p>
          <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em]">{session.user.name}</h1>
        </div>
        <LogoutButton />
      </div>

      <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* Recibidas */}
        <section>
          <h2 className="font-mono text-[10px] tracking-[0.22em] text-ink uppercase mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-azul-500 inline-block" />
            Muestras recibidas
            <span className="text-ink-2">({recibidas.length})</span>
          </h2>
          {recibidas.length === 0 ? (
            <p className="font-sans text-sm text-ink-2 py-8 text-center border border-black/[0.06] bg-salvia-50">
              No hay muestras en proceso actualmente.
            </p>
          ) : (
            <div className="border border-black/[0.08] divide-y divide-black/[0.06]">
              {recibidas.map(o => (
                <div key={o.id} className="px-4 py-3.5 bg-white">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] tracking-[0.15em] text-salvia-700">{o.orderNumber}</span>
                    <span className={`font-mono text-[8px] tracking-[0.18em] uppercase px-2 py-1 ${
                      o.status === "EN_PROCESO" ? "bg-azul-100 text-azul-700" : "bg-salvia-50 text-salvia-700"
                    }`}>
                      {o.status === "EN_PROCESO" ? "En proceso" : "Recibida"}
                    </span>
                  </div>
                  <p className="font-sans text-sm font-medium text-ink">{o.patientName}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="font-sans text-[11px] text-ink-2">{o.species}</p>
                    <p className="font-mono text-[9px] text-ink-2">{new Date(o.createdAt).toLocaleDateString("es-CO")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Procesadas */}
        <section>
          <h2 className="font-mono text-[10px] tracking-[0.22em] text-ink uppercase mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-salvia-500 inline-block" />
            Resultados disponibles
            <span className="text-ink-2">({procesadas.length})</span>
          </h2>

          <div className="bg-azul-50 border border-azul-200 px-4 py-3 mb-3 flex items-start gap-3">
            <span className="text-azul-600 mt-0.5 shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            </span>
            <p className="font-sans text-[12px] text-azul-800 leading-[1.5]">
              Solo se muestran los <strong>últimos 20 resultados</strong>. Descarga tus PDFs a tiempo.
            </p>
          </div>

          {procesadas.length === 0 ? (
            <p className="font-sans text-sm text-ink-2 py-8 text-center border border-black/[0.06] bg-salvia-50">
              Aún no hay resultados disponibles.
            </p>
          ) : (
            <div className="border border-black/[0.08] divide-y divide-black/[0.06]">
              {procesadas.map(o => (
                <div key={o.id} className="px-4 py-3.5 bg-white">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-[10px] tracking-[0.15em] text-salvia-700">{o.orderNumber}</span>
                    <a
                      href={`/api/pdf/${o.id}`}
                      target="_blank"
                      className="font-mono text-[9px] tracking-[0.18em] uppercase bg-salvia-700 text-bone px-3 py-1.5 hover:bg-salvia-800 transition-colors"
                    >
                      PDF →
                    </a>
                  </div>
                  <p className="font-sans text-sm font-medium text-ink">{o.patientName}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="font-sans text-[11px] text-ink-2">{o.species}</p>
                    <p className="font-mono text-[9px] text-ink-2">{new Date(o.updatedAt).toLocaleDateString("es-CO")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
