import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import Link from "next/link"

export const metadata: Metadata = { title: "Panel" }

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  const [totalOrders, requested, pending, inProcess, completed] = await Promise.all([
    prisma.order.count(),
    prisma.order.count({ where: { status: "SOLICITADA" } }),
    prisma.order.count({ where: { status: "RECIBIDA" } }),
    prisma.order.count({ where: { status: "EN_PROCESO" } }),
    prisma.order.count({ where: { status: "COMPLETADA" } }),
  ])

  const recentOrders = await prisma.order.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: { clinic: true, branch: { select: { name: true } }, exams: { include: { template: true } } },
  })

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl">
      <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Panel</p>
      <h1 className="font-serif text-[32px] font-medium tracking-[-0.02em] mt-1 mb-6">
        Bienvenido, {session?.user.name?.split(" ")[0]}
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {[
          { label: "Total órdenes", value: totalOrders, color: "bg-ink text-bone" },
          { label: "Solicitadas (portal)", value: requested, color: "bg-amber-100 text-ink", status: "SOLICITADA" },
          { label: "Recibidas", value: pending, color: "bg-salvia-100 text-ink", status: "RECIBIDA" },
          { label: "En proceso", value: inProcess, color: "bg-azul-100 text-ink", status: "EN_PROCESO" },
          { label: "Completadas", value: completed, color: "bg-salvia-700 text-bone", status: "COMPLETADA" },
        ].map(({ label, value, color, status }) => (
          <Link key={label} href={status ? `/muestras?status=${status}` : "/muestras"} className={`${color} p-5 hover:opacity-90 transition-opacity`}>
            <p className="font-serif text-[36px] font-medium leading-none">{value}</p>
            <p className="font-mono text-[8px] tracking-[0.2em] uppercase mt-2 opacity-70">{label}</p>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Órdenes recientes</p>
        <Link href="/muestras" className="font-mono text-[9px] tracking-[0.18em] text-ink-2 hover:text-ink uppercase">
          Ver todas →
        </Link>
      </div>
      <div className="border border-black/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-salvia-50 border-b border-black/10">
              <th className="text-left px-4 py-2.5 font-mono text-[8px] tracking-[0.18em] uppercase text-salvia-700">N° Orden</th>
              <th className="text-left px-4 py-2.5 font-mono text-[8px] tracking-[0.18em] uppercase text-salvia-700">Paciente</th>
              <th className="text-left px-4 py-2.5 font-mono text-[8px] tracking-[0.18em] uppercase text-salvia-700">Clínica</th>
              <th className="text-left px-4 py-2.5 font-mono text-[8px] tracking-[0.18em] uppercase text-salvia-700">Exámenes</th>
              <th className="text-left px-4 py-2.5 font-mono text-[8px] tracking-[0.18em] uppercase text-salvia-700">Estado</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((order, i) => (
              <tr key={order.id} className={`border-b border-black/[0.06] hover:bg-salvia-50/50 transition-colors ${i % 2 === 0 ? "" : "bg-black/[0.015]"}`}>
                <td className="px-4 py-2.5">
                  <Link href={`/muestras/${order.id}`} className="font-mono text-[11px] text-salvia-700 hover:underline">
                    {order.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-2.5 font-sans text-xs">{order.patientName} <span className="text-ink-2">({order.species})</span></td>
                <td className="px-4 py-2.5 font-sans text-xs text-ink-2">{order.clinic?.name ?? "—"}{order.branch && <span className="block font-mono text-[8px] tracking-[0.12em] uppercase text-salvia-700 mt-0.5">Sede {order.branch.name}</span>}</td>
                <td className="px-4 py-2.5 font-sans text-xs text-ink-2">
                  {order.exams.map(e => e.template.name).join(", ")}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={order.status} />
                </td>
              </tr>
            ))}
            {recentOrders.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center font-sans text-xs text-ink-2">
                  No hay órdenes todavía.{" "}
                  <Link href="/muestras/nueva" className="text-salvia-700 hover:underline">Registrar la primera →</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    SOLICITADA: { label: "Solicitada", className: "bg-amber-100 text-amber-900" },
    RECIBIDA: { label: "Recibida", className: "bg-salvia-100 text-salvia-800" },
    EN_PROCESO: { label: "En proceso", className: "bg-azul-100 text-azul-800" },
    COMPLETADA: { label: "Completada", className: "bg-salvia-700 text-bone" },
  }
  const s = map[status] ?? { label: status, className: "bg-black/10 text-ink" }
  return (
    <span className={`${s.className} font-mono text-[8px] tracking-[0.15em] uppercase px-2 py-0.5`}>
      {s.label}
    </span>
  )
}
