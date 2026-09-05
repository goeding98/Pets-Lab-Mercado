import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/db"
import NewItemForm from "./NewItemForm"
import InventoryRow from "./InventoryRow"

export const metadata: Metadata = { title: "Inventario" }

export default async function InventarioPage() {
  const items = await prisma.inventoryItem.findMany({ orderBy: { name: "asc" } })

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Inventario</p>
          <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">Insumos de laboratorio</h1>
        </div>
        <Link
          href="/inventario/recetas"
          className="border border-salvia-700 text-salvia-700 font-mono text-[10px] tracking-[0.22em] uppercase px-5 py-3 hover:bg-salvia-50 transition-colors"
        >
          Recetas de exámenes →
        </Link>
      </div>

      <NewItemForm />

      <div className="border border-black/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-salvia-50 border-b border-black/10">
              {["Nombre", "Presentación", "Stock", "Ajustar stock", ""].map(h => (
                <th key={h} className="text-left px-4 py-2.5 font-mono text-[8px] tracking-[0.18em] uppercase text-salvia-700">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <InventoryRow key={item.id} item={item} isEven={i % 2 !== 0} />
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center font-sans text-xs text-ink-2">
                  No hay items de inventario. Agrega el primero arriba.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
