import type { Metadata } from "next"
import { prisma } from "@/lib/db"
import { isDescriptiveSection } from "@/lib/sections"
import RangesEditor, { type MasterExam } from "./RangesEditor"
import OrinaConfigEditor from "./OrinaConfigEditor"
import { getOrinaConfig } from "@/lib/settings"

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

  // Hemogramas: bloque propio arriba (adulto, por edad y simple), cada uno con a qué se aplica
  const HEMOGRAMAS: [string, string][] = [
    ["Hemograma Completo con Recuento de Reticulocitos", "Adulto. Sus rangos se aplican también al hemograma de todos los perfiles y al Hemograma Simple."],
    ["Hemograma 0 - 2 Meses", "Cachorros de 0 a 2 meses. Rangos propios."],
    ["Hemograma 2.5 - 3 Meses", "Cachorros de 2.5 a 3 meses. Rangos propios."],
    ["Hemograma 4 - 6 Meses", "Cachorros de 4 a 6 meses. Rangos propios."],
    ["Hemograma Simple / Proteínas Plasmáticas", "Sigue los rangos del Hemograma Completo (adulto): se editan allá."],
  ]
  const hemogramas = HEMOGRAMAS
    .map(([name, note]) => {
      const t = masters.find(m => m.name === name)
      return t ? { ...toExam(t, "Hemogramas"), note } : null
    })
    .filter((e): e is MasterExam & { note: string } => e !== null)
  const otros = masters.filter(m => !HEMOGRAMAS.some(([name]) => name === m.name))

  const exams: MasterExam[] = [
    ...hemogramas,
    ...otros.map(t => toExam(t, t.area)),
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
        perfiles y el Hemograma Simple). Los hemogramas por edad (0 - 2, 2.5 - 3 y 4 - 6 meses) tienen sus rangos
        aparte. Los resultados ya guardados conservan su marca de &quot;fuera de rango&quot; hasta que se vuelvan a guardar.
      </p>
      {/* El Parcial de Orina tiene resultado estructurado: sus referencias van en una configuración aparte */}
      <details className="border border-black/10 bg-white mb-8 group">
        <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
          <span className="font-sans text-sm font-medium text-ink">Parcial de Orina — referencias por especie y UPC</span>
          <span className="font-mono text-[8px] tracking-[0.15em] uppercase text-ink-2 group-open:hidden">Editar ›</span>
        </summary>
        <OrinaConfigEditor initial={await getOrinaConfig()} />
      </details>

      <RangesEditor exams={exams} />
    </div>
  )
}
