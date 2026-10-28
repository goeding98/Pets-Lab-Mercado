// Reporte por partes de un perfil/promoción/personalizado: las secciones copiadas de cada examen componente
// ("Hemograma Completo — Morfología…", "ALT / GPT — Bioquímica Sanguínea", "Coprológico"…) se agrupan en
// partes que se pueden emitir solas (PDF y WhatsApp), p. ej. mandar el hemograma mientras el coprológico
// sigue en proceso. Lo usan ExamResultForm (selector), api/pdf/exam/[examId]?parts= y /r/<token> (kind "p").

const RULES: [RegExp, string][] = [
  [/hemograma|morfolog|hemopar[aá]sit|extendido de sangre|gota gruesa|frotis/i, "Hemograma"],
  [/coagulaci|tromboplastina|protrombina/i, "Coagulación"],
  [/bioqu[ií]mica|qu[ií]mica sangu|electrolit/i, "Química sanguínea"],
  [/coprol|coprosc|sangre oculta/i, "Coprológico"],
  [/orina|\bupc\b|urocult/i, "Orina"],
]

export function sectionPart(sectionName: string): string {
  for (const [re, part] of RULES) if (re.test(sectionName)) return part
  return sectionName.split(" — ")[0].trim()
}

// Partes de un examen, en el orden en que aparecen. Solo los exámenes armados con varios exámenes
// (área Perfiles o promoción/personalizado) se parten; un examen simple con varias secciones es uno solo.
export function examParts(template: { area: string; isPromotion?: boolean; sections: { name: string }[] }): string[] {
  if (template.area !== "Perfiles" && !template.isPromotion) return []
  const parts: string[] = []
  for (const s of template.sections) {
    const p = sectionPart(s.name)
    if (!parts.includes(p)) parts.push(p)
  }
  return parts.length > 1 ? parts : []
}

// Plantilla recortada a las partes pedidas (para el PDF); el título dice qué partes son
export function templateForParts<T extends { name: string; sections: { name: string }[] }>(template: T, parts: string[]): T {
  return {
    ...template,
    name: `${template.name} (${parts.join(" + ")})`,
    sections: template.sections.filter(s => parts.includes(sectionPart(s.name))),
  }
}
