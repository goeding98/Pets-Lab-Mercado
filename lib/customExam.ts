import { prisma } from "./db"
import { combinedTurnaround, composeSections } from "./composeTemplate"

// Crea un examen personalizado (ver actions/customExams.ts). Sin chequeo de permisos: lo llaman la
// acción del servidor (que sí lo chequea) y scripts.
export async function createCustomExamCore(input: {
  name: string
  area: string
  clinicIds: string[]
  templateIds: string[]
  price: number
}): Promise<{ error?: string; success?: boolean }> {
  const name = input.name.trim()
  const area = input.area.trim()
  const ids = Array.from(new Set(input.templateIds))
  const clinicIds = Array.from(new Set(input.clinicIds))
  if (!name) return { error: "Ponle un nombre al examen." }
  if (!area) return { error: "Elige la categoría." }
  if (clinicIds.length === 0) return { error: "Elige al menos un cliente." }
  if (ids.length === 0) return { error: "Selecciona al menos un examen." }
  if (!Number.isFinite(input.price) || input.price <= 0) return { error: "Ponle el precio." }

  if (await prisma.clinic.count({ where: { id: { in: clinicIds } } }) !== clinicIds.length) {
    return { error: "Alguno de los clientes ya no existe." }
  }
  // Mismo nombre que un examen del catálogo general, o que otro personalizado de esos clientes: confunde
  const clash = await prisma.examTemplate.findFirst({
    where: {
      active: true,
      name: { equals: name, mode: "insensitive" },
      OR: [{ isCustom: false }, { clients: { some: { id: { in: clinicIds } } } }],
    },
  })
  if (clash) return { error: "Ya hay un examen activo con ese nombre para alguno de esos clientes." }

  // Componentes: exámenes simples del catálogo (no perfiles, promociones ni otros personalizados)
  const found = await prisma.examTemplate.findMany({
    where: { id: { in: ids }, active: true, isPromotion: false, isCustom: false, NOT: { area: "Perfiles" } },
    include: {
      sections: { orderBy: { order: "asc" }, include: { fields: { orderBy: { order: "asc" } } } },
      recipeItems: true,
    },
  })
  if (found.length !== ids.length) return { error: "Alguno de los exámenes elegidos no está disponible (los perfiles no se pueden incluir)." }
  const components = ids.map(id => found.find(t => t.id === id)!)

  const recipe = new Map<string, number>()
  for (const t of components) for (const r of t.recipeItems) recipe.set(r.itemId, (recipe.get(r.itemId) ?? 0) + r.quantity)

  await prisma.examTemplate.create({
    data: {
      name,
      area,
      turnaround: combinedTurnaround(components.map(t => t.turnaround)),
      sampleType: Array.from(new Set(components.map(t => t.sampleType))).join(" + "),
      description: components.map(t => t.name).join(", "),
      isPromotion: true,
      isCustom: true,
      price: input.price,
      clients: { connect: clinicIds.map(id => ({ id })) },
      sections: { create: composeSections(components) },
      recipeItems: { create: Array.from(recipe.entries()).map(([itemId, quantity]) => ({ itemId, quantity })) },
      promoComponents: { create: components.map((t, i) => ({ templateId: t.id, order: i })) },
    },
  })

  return { success: true }
}

