import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/db"
import RecipeEditor from "./RecipeEditor"

export const metadata: Metadata = { title: "Recetas de exámenes" }

export default async function RecetasPage() {
  const [templates, items] = await Promise.all([
    prisma.examTemplate.findMany({
      orderBy: [{ area: "asc" }, { name: "asc" }],
      include: { recipeItems: true },
    }),
    prisma.inventoryItem.findMany({ orderBy: { name: "asc" } }),
  ])

  const byArea = new Map<string, typeof templates>()
  for (const t of templates) {
    if (!byArea.has(t.area)) byArea.set(t.area, [])
    byArea.get(t.area)!.push(t)
  }

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/inventario" className="font-mono text-[9px] tracking-[0.18em] text-ink-2 hover:text-ink uppercase">
            ← Inventario
          </Link>
        </div>
        <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Inventario</p>
        <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">Recetas de exámenes</h1>
        <p className="font-sans text-sm text-ink-2 mt-2 max-w-2xl">
          Define qué insumos y en qué cantidad consume cada examen. Al completarse un examen de una muestra,
          el sistema descuenta automáticamente estas cantidades del inventario.
        </p>
      </div>

      {items.length === 0 && (
        <div className="bg-azul-50 border border-azul-200 px-4 py-3 mb-6">
          <p className="font-sans text-sm text-ink">
            Todavía no hay items de inventario.{" "}
            <Link href="/inventario" className="text-azul-700 hover:underline">Agrega algunos primero →</Link>
          </p>
        </div>
      )}

      <div className="space-y-8">
        {Array.from(byArea.entries()).map(([area, templatesInArea]) => (
          <div key={area}>
            <p className="font-mono text-[8px] tracking-[0.2em] text-ink-2 uppercase mb-3 border-b border-black/[0.06] pb-1">
              {area}
            </p>
            <div className="space-y-4">
              {templatesInArea.map(t => (
                <RecipeEditor
                  key={t.id}
                  templateId={t.id}
                  templateName={t.name}
                  items={items}
                  initialRecipe={t.recipeItems.map(ri => ({ itemId: ri.itemId, quantity: ri.quantity }))}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
