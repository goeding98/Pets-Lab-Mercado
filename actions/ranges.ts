"use server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"
import { Prisma } from "@prisma/client"
import { readOrinaConfig } from "@/lib/orina"

// El PDF usa Helvetica (Latin-1): se cambian los símbolos que no puede dibujar por equivalentes ASCII
function clean(value: string): string | null {
  const v = value
    .replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/−/g, "-").replace(/×/g, "x")
    .replace(/\s+/g, " ")
    .trim()
  return v === "" ? null : v
}

// Guarda el rango de un parámetro maestro y lo copia a todos sus parámetros copia (perfiles,
// promociones, exámenes derivados como el Hemograma Simple).
export async function updateFieldRanges(
  fieldId: string,
  refCanine: string,
  refFeline: string,
): Promise<{ error?: string; copies?: number }> {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "rangos")) return { error: "No autorizado" }

  const field = await prisma.examField.findUnique({ where: { id: fieldId }, select: { sourceFieldId: true } })
  if (!field) return { error: "Parámetro no encontrado" }
  if (field.sourceFieldId) return { error: "Este parámetro es copia de otro: edítalo en su examen maestro" }

  const data = { refCanine: clean(refCanine), refFeline: clean(refFeline) }
  const [, copies] = await prisma.$transaction([
    prisma.examField.update({ where: { id: fieldId }, data }),
    prisma.examField.updateMany({ where: { sourceFieldId: fieldId }, data }),
  ])

  revalidatePath("/rangos")
  return { copies: copies.count }
}

// Cambia el nombre de un parámetro maestro y de todas sus copias (perfiles, promociones). Los resultados
// ya guardados no cambian (van por id); los PDF nuevos salen con el nombre nuevo.
export async function updateFieldName(fieldId: string, name: string): Promise<{ error?: string; copies?: number }> {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "rangos")) return { error: "No autorizado" }

  const value = clean(name)
  if (!value) return { error: "El nombre no puede quedar vacío" }
  const field = await prisma.examField.findUnique({ where: { id: fieldId }, select: { sourceFieldId: true } })
  if (!field) return { error: "Parámetro no encontrado" }
  if (field.sourceFieldId) return { error: "Este parámetro es copia de otro: renómbralo en su examen maestro" }

  const [, copies] = await prisma.$transaction([
    prisma.examField.update({ where: { id: fieldId }, data: { name: value } }),
    prisma.examField.updateMany({ where: { sourceFieldId: fieldId }, data: { name: value } }),
  ])
  revalidatePath("/rangos")
  return { copies: copies.count }
}

// Cambia el nombre de un examen maestro. Donde está copiado (perfiles, promociones, personalizados) sus
// secciones se llaman "<examen> — <sección>" y el "Incluye" de los personalizados lista los nombres: se
// actualizan también. Las órdenes ya hechas muestran el nombre nuevo (van por id).
export async function updateExamName(templateId: string, name: string): Promise<{ error?: string; copies?: number }> {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "rangos")) return { error: "No autorizado" }

  const value = clean(name)
  if (!value) return { error: "El nombre no puede quedar vacío" }
  const t = await prisma.examTemplate.findUnique({ where: { id: templateId }, select: { name: true, isPromotion: true } })
  if (!t) return { error: "Examen no encontrado" }
  if (t.isPromotion) return { error: "Las promociones y personalizados se renombran en su módulo" }
  if (value === t.name) return {}
  if (await prisma.examTemplate.findFirst({ where: { id: { not: templateId }, active: true, isCustom: false, name: { equals: value, mode: "insensitive" } } })) {
    return { error: "Ya existe otro examen activo con ese nombre" }
  }

  const prefix = `${t.name} — `
  const sections = await prisma.examSection.findMany({ where: { name: { startsWith: prefix } }, select: { id: true, name: true, templateId: true } })
  const customs = await prisma.examTemplate.findMany({ where: { isCustom: true, description: { contains: t.name } }, select: { id: true, description: true } })
  await prisma.$transaction([
    prisma.examTemplate.update({ where: { id: templateId }, data: { name: value } }),
    ...sections.map(s => prisma.examSection.update({ where: { id: s.id }, data: { name: `${value} — ${s.name.slice(prefix.length)}` } })),
    ...customs.map(c => prisma.examTemplate.update({ where: { id: c.id }, data: { description: c.description!.split(t.name).join(value) } })),
  ])
  revalidatePath("/rangos")
  revalidatePath("/servicios")
  return { copies: new Set(sections.map(s => s.templateId)).size }
}

// Valores de referencia por especie y cortes del UPC del Parcial de Orina (LabSetting "orina")
export async function saveOrinaConfig(config: unknown): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "rangos")) return { error: "No autorizado" }
  const value = readOrinaConfig(config)
  for (const sp of ["canino", "felino"] as const) {
    const c = value.upc[sp]
    if (!(c.limitrofe > 0 && c.proteinurico > c.limitrofe)) return { error: `UPC ${sp}: el corte "proteinúrico" debe ser mayor que el "limítrofe"` }
  }
  await prisma.labSetting.upsert({
    where: { key: "orina" },
    create: { key: "orina", value: value as unknown as Prisma.InputJsonValue },
    update: { value: value as unknown as Prisma.InputJsonValue },
  })
  revalidatePath("/rangos")
  return {}
}
