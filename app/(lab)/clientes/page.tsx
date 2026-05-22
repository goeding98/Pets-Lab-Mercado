import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/db"

export const metadata: Metadata = { title: "Clientes" }

export default async function ClientesPage() {
  const clinics = await prisma.clinic.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { orders: true } } },
  })

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Administración</p>
          <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">Clientes</h1>
        </div>
        <Link
          href="/clientes/nueva"
          className="bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.22em] uppercase px-5 py-3 hover:bg-salvia-800 transition-colors"
        >
          Nueva clínica +
        </Link>
      </div>

      <div className="border border-black/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-salvia-50 border-b border-black/10">
              {["Nombre", "NIT", "Teléfono", "Email", "Dirección", "Órdenes", ""].map(h => (
                <th key={h} className="text-left px-4 py-2.5 font-mono text-[8px] tracking-[0.18em] uppercase text-salvia-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clinics.map((clinic, i) => (
              <tr key={clinic.id} className={`border-b border-black/[0.06] ${i % 2 !== 0 ? "bg-black/[0.015]" : ""}`}>
                <td className="px-4 py-3 font-sans text-sm font-medium">{clinic.name}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-ink-2">{clinic.nit ?? "—"}</td>
                <td className="px-4 py-3 font-sans text-xs text-ink-2">{clinic.phone ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-ink-2">{clinic.email ?? "—"}</td>
                <td className="px-4 py-3 font-sans text-xs text-ink-2">{clinic.address ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-ink-2">{clinic._count.orders}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/clientes/${clinic.id}`}
                    className="font-mono text-[9px] tracking-[0.15em] text-salvia-700 hover:underline uppercase"
                  >
                    Editar →
                  </Link>
                </td>
              </tr>
            ))}
            {clinics.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center font-sans text-xs text-ink-2">
                  No hay clientes registrados.{" "}
                  <Link href="/clientes/nueva" className="text-salvia-700 hover:underline">
                    Agregar el primero →
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
