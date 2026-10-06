import type { Prisma } from "@prisma/client"
import { prisma } from "./db"

// Exámenes que se pueden pedir en una orden nueva para una clínica: los activos del catálogo general
// más los personalizados (/personalizados) de esa clínica. Un personalizado nunca se ofrece a otra
// clínica, a una orden sin clínica ni en la página pública /servicios.
export function catalogWhere(clinicId: string | null): Prisma.ExamTemplateWhereInput {
  return clinicId
    ? { active: true, OR: [{ isCustom: false }, { clients: { some: { id: clinicId } } }] }
    : { active: true, isCustom: false }
}

// Valida en el servidor que todos los exámenes elegidos estén disponibles para esa clínica
export async function assertOrderableTemplates(templateIds: string[], clinicId: string | null) {
  if (templateIds.length === 0) throw new Error("Selecciona al menos un examen")
  const ok = await prisma.examTemplate.count({ where: { id: { in: templateIds }, ...catalogWhere(clinicId) } })
  if (ok !== new Set(templateIds).size) throw new Error("Examen no válido para esta clínica")
}
