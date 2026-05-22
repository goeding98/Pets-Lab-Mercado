import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/db"

export const metadata: Metadata = { title: "Muestras" }

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  RECIBIDA: { label: "Recibida", className: "bg-salvia-100 text-salvia-800" },
  EN_PROCESO: { label: "En proceso", className: "bg-azul-100 text-azul-800" },
  COMPLETADA: { label: "Completada", className: "bg-salvia-700 text-bone" },
}

export default async function MuestrasPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string }
}) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (searchParams.status) where.status = searchParams.status
  if (searchParams.q) {
    where.OR = [
      { orderNumber: { contains: searchParams.q } },
      { patientName: { contains: searchParams.q } },
      { ownerName: { contains: searchParams.q } },
    ]
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { clinic: true, exams: { include: { template: true } } },
  })

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Muestras</p>
          <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">Órdenes de laboratorio</h1>
        </div>
        <Link
          href="/muestras/nueva"
          className="bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.22em] uppercase px-5 py-3 hover:bg-salvia-800 transition-colors"
        >
          Nueva muestra +
        </Link>
      </div>

      {/* Filters */}
      <form method="get" className="flex gap-3 mb-5">
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="Buscar por N° orden, paciente, dueño…"
          className="border border-black/20 bg-white px-3 py-2 text-sm font-sans flex-1 focus:outline-2 focus:outline-salvia-700"
        />
        <select
          name="status"
          defaultValue={searchParams.status ?? ""}
          className="border border-black/20 bg-white px-3 py-2 text-sm font-sans focus:outline-2 focus:outline-salvia-700"
        >
          <option value="">Todos los estados</option>
          <option value="RECIBIDA">Recibida</option>
          <option value="EN_PROCESO">En proceso</option>
          <option value="COMPLETADA">Completada</option>
        </select>
        <button type="submit" className="bg-salvia-700 text-bone font-mono text-[9px] tracking-[0.18em] uppercase px-4 py-2">
          Filtrar
        </button>
      </form>

      <div className="border border-black/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-salvia-50 border-b border-black/10">
              {["N° Orden", "Paciente / Especie", "Clínica", "Exámenes", "Fecha", "Estado", ""].map(h => (
                <th key={h} className="text-left px-4 py-2.5 font-mono text-[8px] tracking-[0.18em] uppercase text-salvia-700">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order, i) => {
              const s = STATUS_LABELS[order.status] ?? { label: order.status, className: "bg-black/10 text-ink" }
              return (
                <tr key={order.id} className={`border-b border-black/[0.06] hover:bg-salvia-50/50 transition-colors ${i % 2 !== 0 ? "bg-black/[0.015]" : ""}`}>
                  <td className="px-4 py-3">
                    <Link href={`/muestras/${order.id}`} className="font-mono text-[11px] text-salvia-700 hover:underline">
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-sans text-xs">
                    {order.patientName}
                    <span className="text-ink-2 ml-1">({order.species})</span>
                  </td>
                  <td className="px-4 py-3 font-sans text-xs text-ink-2">{order.clinic?.name ?? "—"}</td>
                  <td className="px-4 py-3 font-sans text-xs text-ink-2 max-w-[200px] truncate">
                    {order.exams.map(e => e.template.name).join(", ")}
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-ink-2">
                    {new Date(order.createdAt).toLocaleDateString("es-CO")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`${s.className} font-mono text-[8px] tracking-[0.15em] uppercase px-2 py-0.5`}>
                      {s.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/muestras/${order.id}`} className="font-mono text-[9px] tracking-[0.15em] text-salvia-700 hover:underline uppercase">
                      Ver →
                    </Link>
                  </td>
                </tr>
              )
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center font-sans text-xs text-ink-2">
                  No hay órdenes.{" "}
                  <Link href="/muestras/nueva" className="text-salvia-700 hover:underline">Registrar nueva muestra →</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
