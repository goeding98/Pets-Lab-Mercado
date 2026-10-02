// Arma las secciones de un examen compuesto (promoción o perfil) copiando las de sus exámenes
// componentes, en orden. Lo usan actions/promotions.ts y el script que carga los perfiles.

type SourceField = {
  name: string
  key: string | null
  unit: string | null
  refCanine: string | null
  refFeline: string | null
  technique: string | null
  fieldType: string
  calcFormula: string | null
  order: number
  id?: string // si viene de la base: la copia queda ligada a su maestro (rangos editables en /rangos)
  sourceFieldId?: string | null
}

export type ComposeComponent = {
  name: string
  sections: { name: string; fields: SourceField[] }[]
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

export function composeSections(components: ComposeComponent[]) {
  // Las fórmulas se resuelven por `key` en todo el examen, así que si dos componentes comparten
  // un parámetro (p. ej. ambos tienen ALT) el segundo se renombra para que no se mezclen.
  const usedKeys = new Set<string>()
  let sectionOrder = 0
  return components.flatMap(t =>
    t.sections.map(section => {
      const renames = new Map<string, string>()
      for (const f of section.fields) {
        if (!f.key) continue
        let k = f.key
        for (let n = 2; usedKeys.has(k); n++) k = `${f.key}__${n}`
        renames.set(f.key, k)
      }
      renames.forEach(k => usedKeys.add(k))
      const rewrite = (formula: string | null) =>
        formula &&
        Array.from(renames.entries()).reduce(
          (acc, [from, to]) => (from === to ? acc : acc.replace(new RegExp(`\\b${escapeRegex(from)}\\b`, "g"), to)),
          formula,
        )

      return {
        // Prefijo con el examen de origen para que en la captura y el PDF se sepa de dónde viene
        name: section.name.toLowerCase() === t.name.toLowerCase() ? t.name : `${t.name} — ${section.name}`,
        order: sectionOrder++,
        fields: {
          create: section.fields.map(f => ({
            name: f.name,
            key: f.key ? renames.get(f.key) : null,
            unit: f.unit,
            refCanine: f.refCanine,
            refFeline: f.refFeline,
            technique: f.technique,
            fieldType: f.fieldType,
            calcFormula: rewrite(f.calcFormula),
            order: f.order,
            sourceFieldId: f.sourceFieldId ?? f.id ?? null,
          })),
        },
      }
    }),
  )
}

// "Mismo día"/"Diario" < "24h"/"12-24 horas" < "1-2 días" < "30 días"… — un examen compuesto
// tarda lo que tarde su componente más lento
function turnaroundHours(t: string): number | null {
  const s = t.toLowerCase()
  if (s.includes("mismo") || s.includes("diario")) return 0
  const h = s.match(/(\d+)\s*h/)
  if (h) return Number(h[1])
  const d = s.match(/(\d+)\s*d/)
  if (d) return Number(d[1]) * 24
  return null
}

export function combinedTurnaround(values: string[]): string {
  const unique = Array.from(new Set(values))
  if (unique.length === 1) return unique[0]
  const parsed = unique.map(v => ({ v, h: turnaroundHours(v) }))
  if (parsed.every(p => p.h !== null)) return parsed.sort((a, b) => b.h! - a.h!)[0].v
  return unique.join(" / ")
}
