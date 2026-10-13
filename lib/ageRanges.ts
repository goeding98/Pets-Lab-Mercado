import { prisma } from "./db"

// Rangos del hemograma según la edad del paciente. Los perfiles, el Hemograma Completo y el Simple usan los
// campos del "Hemograma Completo" (adulto, ver ExamField.sourceFieldId). Si la orden es de un cachorro, esos
// campos toman los rangos del hemograma por edad (maestros aparte, editables en /rangos) con el mismo `key`.
// Se aplica al mostrar (formulario), al marcar "fuera de rango" y en el PDF. Solo servidor.

const ADULT = "Hemograma Completo con Recuento de Reticulocitos"
const BANDS = [
  { maxMonths: 2, template: "Hemograma 0 - 2 Meses", label: "0 - 2 meses" },
  { maxMonths: 3.5, template: "Hemograma 2.5 - 3 Meses", label: "2.5 - 3 meses" },
  { maxMonths: 6, template: "Hemograma 4 - 6 Meses", label: "4 - 6 meses" },
] as const

// Edad en meses a partir del texto libre de la orden ("1 mes", "45 días", "10 semanas", "2 años", "3m")
export function ageInMonths(age: string | null | undefined): number | null {
  const t = (age ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(",", ".")
  const m = t.match(/(\d+(?:\.\d+)?)\s*(d|dia|dias|s|sem|semana|semanas|m|mes|meses|a|ano|anos|y)\b/)
  if (!m) return null
  const n = Number(m[1]), u = m[2]
  if (u.startsWith("d")) return n / 30
  if (u.startsWith("s")) return (n * 7) / 30
  if (u.startsWith("m")) return n
  return n * 12
}

export function ageBand(age: string | null | undefined) {
  const months = ageInMonths(age)
  if (months === null) return null
  return BANDS.find(b => months <= b.maxMonths) ?? null
}

type FieldLike = { id: string; key?: string | null; sourceFieldId?: string | null; refCanine?: string | null; refFeline?: string | null }
type ExamLike = { template: { name: string; sections: { fields: FieldLike[] }[] } }

// Devuelve los exámenes con los rangos del hemograma ajustados a la edad (sin tocar la base) y una nota
export async function applyAgeRanges<T extends ExamLike>(exams: T[], age: string | null | undefined): Promise<{ exams: T[]; note: string | null }> {
  const band = ageBand(age)
  if (!band) return { exams, note: null }
  // Solo si algún examen usa el hemograma de adulto (y no es ya el hemograma por edad)
  const [adult, young] = await Promise.all([
    prisma.examTemplate.findFirst({ where: { name: ADULT }, select: { sections: { select: { fields: { select: { id: true, key: true } } } } } }),
    prisma.examTemplate.findFirst({ where: { name: band.template, active: true }, select: { sections: { select: { fields: { select: { key: true, refCanine: true, refFeline: true } } } } } }),
  ])
  if (!adult || !young) return { exams, note: null }
  const youngByKey = new Map(young.sections.flatMap(s => s.fields).filter(f => f.key).map(f => [f.key!, f]))
  const adultKey = new Map(adult.sections.flatMap(s => s.fields).map(f => [f.id, f.key]))

  let changed = false
  const out = exams.map(e => {
    if (e.template.name === band.template) return e
    return {
      ...e,
      template: {
        ...e.template,
        sections: e.template.sections.map(s => ({
          ...s,
          fields: s.fields.map(f => {
            const key = adultKey.get(f.sourceFieldId ?? f.id)
            const y = key ? youngByKey.get(key) : undefined
            if (!y) return f
            changed = true
            return { ...f, refCanine: y.refCanine, refFeline: y.refFeline }
          }),
        })),
      },
    }
  })
  return { exams: out as T[], note: changed ? `Rangos del hemograma de cachorro ${band.label} (edad registrada: ${age!.trim()})` : null }
}
