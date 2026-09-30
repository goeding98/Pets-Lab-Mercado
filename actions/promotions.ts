"use server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"
import { combinedTurnaround, composeSections } from "@/lib/composeTemplate"

const PROMO_AREA = "Promociones"

async function requirePermission() {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "promociones")) throw new Error("No autorizado")
}

function revalidateCatalog() {
  revalidatePath("/promociones")
  revalidatePath("/muestras/nueva")
  revalidatePath("/portal-vet/nueva")
  revalidatePath("/inventario/recetas")
  revalidatePath("/servicios")
}

// Crea una promoción: un ExamTemplate nuevo con copia de las secciones, campos (rangos,
// fórmulas) y receta de inventario de cada examen elegido, en el orden elegido.
export async function createPromotion(
  name: string,
  templateIds: string[],
  price: number | null,
): Promise<{ error?: string; success?: boolean }> {
  await requirePermission()

  if (price !== null && (!Number.isFinite(price) || price < 0)) return { error: "El precio no es válido." }

  name = name.trim()
  const ids = Array.from(new Set(templateIds))
  if (!name) return { error: "Ponle un nombre a la promoción." }
  if (ids.length < 2) return { error: "Selecciona al menos dos exámenes." }
  if (await prisma.examTemplate.findFirst({ where: { name: { equals: name, mode: "insensitive" }, active: true } })) {
    return { error: "Ya existe un examen o promoción activo con ese nombre." }
  }

  const found = await prisma.examTemplate.findMany({
    where: { id: { in: ids }, active: true, isPromotion: false },
    include: {
      sections: { orderBy: { order: "asc" }, include: { fields: { orderBy: { order: "asc" } } } },
      recipeItems: true,
    },
  })
  if (found.length !== ids.length) return { error: "Alguno de los exámenes elegidos ya no está disponible." }
  const components = ids.map(id => found.find(t => t.id === id)!)

  const sections = composeSections(components)

  // Receta: suma de los insumos de todos los componentes
  const recipe = new Map<string, number>()
  for (const t of components) for (const r of t.recipeItems) recipe.set(r.itemId, (recipe.get(r.itemId) ?? 0) + r.quantity)

  await prisma.examTemplate.create({
    data: {
      name,
      area: PROMO_AREA,
      turnaround: combinedTurnaround(components.map(t => t.turnaround)),
      sampleType: Array.from(new Set(components.map(t => t.sampleType))).join(" + "),
      isPromotion: true,
      price,
      sections: { create: sections },
      recipeItems: { create: Array.from(recipe.entries()).map(([itemId, quantity]) => ({ itemId, quantity })) },
      promoComponents: { create: components.map((t, i) => ({ templateId: t.id, order: i })) },
    },
  })

  revalidateCatalog()
  return { success: true }
}

export async function updatePromotionPrice(id: string, price: number | null) {
  await requirePermission()
  if (price !== null && (!Number.isFinite(price) || price < 0)) throw new Error("Precio no válido")
  await prisma.examTemplate.update({ where: { id, isPromotion: true }, data: { price } })
  revalidatePath("/promociones")
}

// Elimina una promoción. Si ya se usó en alguna orden no se puede borrar (esas órdenes guardan sus
// resultados contra estos campos): se retira, deja de ofrecerse en órdenes nuevas.
export async function deletePromotion(id: string): Promise<{ archived: boolean }> {
  await requirePermission()

  const promo = await prisma.examTemplate.findUnique({
    where: { id },
    select: { isPromotion: true, _count: { select: { orderExams: true } } },
  })
  if (!promo || !promo.isPromotion) throw new Error("Promoción no encontrada")

  const archived = promo._count.orderExams > 0
  if (archived) {
    await prisma.examTemplate.update({ where: { id }, data: { active: false } })
  } else {
    await prisma.examTemplate.delete({ where: { id } })
  }

  revalidateCatalog()
  return { archived }
}
