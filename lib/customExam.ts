import { prisma } from "./db"
import { combinedTurnaround, composeSections } from "./composeTemplate"

// Crea o edita un examen personalizado (ver actions/customExams.ts). Sin chequeo de permisos: lo llaman la
// acción del servidor (que sí lo chequea) y scripts.
export type CustomExamInput = {
  name: string
  area: string
  clinicIds: string[]
  templateIds: string[]
  price: number
}

// Valida y carga los componentes. excludeId = el personalizado que se está editando (no choca consigo mismo)
async function prepare(input: CustomExamInput, excludeId?: string) {
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
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
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

  // Lo que se arma con los componentes (secciones, receta, tiempos…)
  const composed = {
    turnaround: combinedTurnaround(components.map(t => t.turnaround)),
    sampleType: Array.from(new Set(components.map(t => t.sampleType))).join(" + "),
    description: components.map(t => t.name).join(", "),
    sections: { create: composeSections(components) },
    recipeItems: { create: Array.from(recipe.entries()).map(([itemId, quantity]) => ({ itemId, quantity })) },
    promoComponents: { create: components.map((t, i) => ({ templateId: t.id, order: i })) },
  }
  return { name, area, clinicIds, ids, price: input.price, composed }
}

export async function createCustomExamCore(input: CustomExamInput): Promise<{ error?: string; success?: boolean }> {
  const p = await prepare(input)
  if ("error" in p) return { error: p.error }
  await prisma.examTemplate.create({
    data: {
      name: p.name, area: p.area, price: p.price, isPromotion: true, isCustom: true,
      clients: { connect: p.clinicIds.map(id => ({ id })) },
      ...p.composed,
    },
  })
  return { success: true }
}

// Editar: nombre, categoría, precio y clientes se cambian en el mismo examen. Si cambian los exámenes
// incluidos: sin órdenes se rearma en el mismo lugar; si ya se usó, se crea una versión nueva y la anterior
// queda retirada (active = false) con sus órdenes y resultados intactos (los resultados apuntan a sus campos).
export async function updateCustomExamCore(id: string, input: CustomExamInput): Promise<{ error?: string; success?: boolean; newVersion?: boolean }> {
  const current = await prisma.examTemplate.findFirst({
    where: { id, isCustom: true, active: true },
    include: { promoComponents: { orderBy: { order: "asc" } }, _count: { select: { orderExams: true } } },
  })
  if (!current) return { error: "Este examen personalizado ya no existe." }
  const p = await prepare(input, id)
  if ("error" in p) return { error: p.error }

  const basics = { name: p.name, area: p.area, price: p.price, clients: { set: p.clinicIds.map(c => ({ id: c })) } }
  const sameComponents = current.promoComponents.map(c => c.templateId).join("|") === p.ids.join("|")

  if (sameComponents) {
    await prisma.examTemplate.update({ where: { id }, data: basics })
    return { success: true }
  }
  if (current._count.orderExams === 0) {
    await prisma.$transaction([
      prisma.examSection.deleteMany({ where: { templateId: id } }),
      prisma.recipeItem.deleteMany({ where: { templateId: id } }),
      prisma.promotionComponent.deleteMany({ where: { promotionId: id } }),
      prisma.examTemplate.update({ where: { id }, data: { ...basics, ...p.composed } }),
    ])
    return { success: true }
  }
  await prisma.$transaction([
    prisma.examTemplate.update({ where: { id }, data: { active: false } }),
    prisma.examTemplate.create({
      data: {
        name: p.name, area: p.area, price: p.price, isPromotion: true, isCustom: true,
        clients: { connect: p.clinicIds.map(c => ({ id: c })) },
        ...p.composed,
      },
    }),
  ])
  return { success: true, newVersion: true }
}
