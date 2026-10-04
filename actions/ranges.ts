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
