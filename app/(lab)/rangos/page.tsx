import type { Metadata } from "next"
import { prisma } from "@/lib/db"
import { isDescriptiveSection } from "@/lib/sections"
import RangesEditor, { type MasterExam } from "./RangesEditor"

export const metadata: Metadata = { title: "Rangos de referencia" }
export const dynamic = "force-dynamic"

const fieldSelect = {
  id: true, name: true, unit: true, refCanine: true, refFeline: true, sourceFieldId: true,
  _count: { select: { copies: true } },
} as const

export default async function RangosPage() {
  // Exámenes maestros: los que se piden solos (no perfiles ni promociones)
  const [masters, composites] = await Promise.all([
    prisma.examTemplate.findMany({
      where: { active: true, isPromotion: false, NOT: { area: "Perfiles" } },
      orderBy: [{ area: "asc" }, { name: "asc" }],
      select: {
        id: true, name: true, area: true,
        sections: { orderBy: { order: "asc" }, select: { name: true, fields: { orderBy: { order: "asc" }, select: fieldSelect } } },
      },
    }),
    // Perfiles/promociones: solo interesan sus parámetros con rango que no vienen de un maestro
    prisma.examTemplate.findMany({
      where: { active: true, OR: [{ area: "Perfiles" }, { isPromotion: true }] },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true,
        sections: { orderBy: { order: "asc" }, select: { name: true, fields: { where: { sourceFieldId: null }, orderBy: { order: "asc" }, select: fieldSelect } } },
      },
    }),
  ])

  // Nombre del examen maestro de cada parámetro copia, para decir dónde se edita
  const sourceIds = Array.from(new Set(masters.flatMap(t => t.sections.flatMap(s => s.fields.map(f => f.sourceFieldId))).filter(Boolean))) as string[]
  const sources = await prisma.examField.findMany({
    where: { id: { in: sourceIds } },
    select: { id: true, section: { select: { template: { select: { name: true } } } } },
  })
  const sourceExam = new Map(sources.map(s => [s.id, s.section.template.name]))

  const toExam = (t: (typeof masters)[number] | (typeof composites)[number], area: string): MasterExam => ({
    id: t.id,
    name: t.name,
    area,
    sections: t.sections
      .filter(s => !isDescriptiveSection(s.name, t.name)) // texto libre: no tiene rangos
      .map(s => ({
        name: s.name,
        fields: s.fields.map(f => ({
          id: f.id, name: f.name, unit: f.unit, refCanine: f.refCanine, refFeline: f.refFeline,
          copies: f._count.copies,
          editedIn: f.sourceFieldId ? sourceExam.get(f.sourceFieldId) ?? "otro examen" : null,
        })),
      }))
      .filter(s => s.fields.length > 0),
  })

  const exams: MasterExam[] = [
    ...masters.map(t => toExam(t, t.area)),
    // De los perfiles solo los parámetros propios que tienen rango (p. ej. Globulinas)
    ...composites
      .map(t => toExam(t, "Parámetros propios de perfiles"))
      .map(e => ({ ...e, sections: e.sections.map(s => ({ ...s, fields: s.fields.filter(f => f.refCanine || f.refFeline) })).filter(s => s.fields.length) })),
  ].filter(e => e.sections.length > 0)

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-5xl">
      <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Catálogo</p>
      <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">Rangos de referencia</h1>
      <p className="font-sans text-sm text-ink-2 mt-2 mb-8 max-w-2xl">
        Rangos canino y felino de cada examen maestro. Al guardar un parámetro se actualiza también en todos
        los perfiles, promociones y exámenes que lo incluyen (por ejemplo, el hemograma de todos los
        perfiles y el Hemograma Simple). Los hemogramas por edad (0 - 3 y 4 - 6 meses) tienen sus rangos
        aparte. Los resultados ya guardados conservan su marca de &quot;fuera de rango&quot; hasta que se vuelvan a guardar.
      </p>
      <RangesEditor exams={exams} />
    </div>
  )
}
