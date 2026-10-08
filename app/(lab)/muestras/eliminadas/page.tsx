import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { formatCOP } from "@/lib/payment"

export const metadata: Metadata = { title: "Muestras eliminadas" }

// Registro de muestras eliminadas (solo ADMIN): quién, cuándo, por qué y qué tenía cada una.
// La copia completa (resultados incluidos) queda en DeletedOrder.snapshot.
type Snap = { exams?: { template?: { name?: string }; status?: string; results?: { parametro: string; valor: string }[] }[] }

export default async function MuestrasEliminadasPage() {
  const rows = await prisma.deletedOrder.findMany({ orderBy: { deletedAt: "desc" }, take: 500 })

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl">
      <Link href="/muestras" className="font-mono text-[9px] tracking-[0.18em] text-ink-2 hover:text-ink uppercase">← Muestras</Link>
      <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-2">Muestras eliminadas</h1>
      <p className="font-sans text-sm text-ink-2 mt-2 mb-6 max-w-2xl">
        Cada muestra borrada con su motivo, quién la eliminó y una copia de sus datos y resultados.
      </p>

      {rows.length === 0 ? (
        <p className="font-sans text-sm text-ink-2 border border-black/10 bg-salvia-50 px-4 py-6 text-center">No se ha eliminado ninguna muestra.</p>
      ) : (
        <div className="space-y-3">
          {rows.map(r => {
            const snap = r.snapshot as Snap
            const withResults = (snap.exams ?? []).filter(e => (e.results ?? []).some(x => x.valor))
            return (
              <div key={r.id} className="border border-black/10 bg-white px-4 py-3.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-sans text-sm text-ink">
                    <strong>{r.patientName}</strong> <span className="text-ink-2">({r.species})</span>
                    <span className="font-mono text-[10px] text-salvia-700 ml-2">{r.orderNumber}</span>
                  </p>
                  <p className="font-mono text-[9px] tracking-[0.12em] uppercase text-ink-2">
                    Eliminada el {r.deletedAt.toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "short", timeStyle: "short" })} por {r.deletedByName}
                  </p>
                </div>
                <p className="font-sans text-xs text-ink-2 mt-1">
                  {[r.clinicName && (r.branchName ? `${r.clinicName} · Sede ${r.branchName}` : r.clinicName), r.ownerName && `Tutor: ${r.ownerName}`,
                    `Creada ${r.orderedAt.toLocaleDateString("es-CO")}`, `Estado: ${r.status}`, `Total ${formatCOP(r.total)} · pagado ${formatCOP(r.paid)}`]
                    .filter(Boolean).join(" · ")}
                </p>
                <p className="font-sans text-xs text-ink mt-1">Exámenes: {r.exams}</p>
                <p className="font-sans text-sm text-ink mt-2 bg-red-50 border border-red-100 px-3 py-2 whitespace-pre-line">
                  <span className="font-mono text-[8px] tracking-[0.18em] uppercase text-red-700 block mb-0.5">Motivo</span>
                  {r.reason}
                </p>
                {withResults.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-mono text-[9px] tracking-[0.15em] uppercase text-salvia-700">Ver resultados que tenía</summary>
                    <div className="mt-2 space-y-2">
                      {withResults.map((e, i) => (
                        <div key={i} className="font-sans text-xs">
                          <p className="font-medium text-ink">{e.template?.name} <span className="text-ink-2">({e.status})</span></p>
                          <p className="text-ink-2">{(e.results ?? []).filter(x => x.valor).map(x => `${x.parametro}: ${x.valor}`).join(" · ")}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
