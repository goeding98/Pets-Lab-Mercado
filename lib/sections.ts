// Secciones de texto libre: no tienen unidad, rangos ni técnica, así que en el formulario y en el
// PDF se muestran solo como Parámetro + Descripción (filas más altas). Son:
// - "Morfología y Observaciones" del hemograma (en los perfiles: "Hemograma Completo — Morfología…")
// - "Hemoparásitos" (Frotis Extendido y Gota Gruesa), también copiada dentro de los perfiles
// - todo el examen "Extendido de Sangre Periférica" (incluida su "Conclusión"; la "Conclusión" de
//   las citologías no entra porque se decide por el nombre del examen)
// - todo el examen "Citología de Piel" (en el Perfil Dermatológico: "Citología de Piel — …")
// - todo el examen "Citología Conjuntival", "Citología de Masa" y "Citología Masa Adicional o Contramuestra"
// - la "Conclusión" de la Citología de Líquidos (solo esa sección; ver DESCRIPTIVE_EXAM_SECTIONS)
// - toda sección "Interpretación" (Citologías Óticas, Malassezia) y la "Citología de Efusión" del Citoquímico
// - "Test de Héller (Proteinuria Cualitativa)" y "Coloración de Wright (Sedimento Urinario)" del
//   Parcial de Orina, y "Coloración de Wright (Heces)" del Coproscópico (no la de Malassezia, que tiene rangos)
// - la sección "Observaciones" del Raspado de Piel ("Raspado de Piel — Observaciones" en los perfiles)
const DESCRIPTIVE_SECTIONS = [
  /morfolog[ií]a y observaciones/i,
  /^hemopar[aá]sitos$/i,
  /^extendido de sangre perif[eé]rica$/i,
  /^citolog[ií]a de piel —/i,
  /test de h[eé]ller/i, // Parcial de Orina (y su copia en los perfiles)
  /^interpretaci[oó]n$/i, // Citologías Óticas, Citología de Piel, Coloración para Malassezia (solo texto)
  /^citolog[ií]a de efusi[oó]n$/i, // Citoquímico de Líquido
  /coloraci[oó]n de wright \((sedimento urinario|heces)\)/i, // Parcial de Orina (y perfiles) y Coproscópico
  /^(raspado de piel — )?observaciones$/i, // Raspado de Piel (y su copia en los Perfiles Dermatológicos)
]
const DESCRIPTIVE_EXAMS = [
  /gota gruesa/i,
  /^extendido de sangre perif[eé]rica$/i,
  /^citolog[ií]a de piel$/i,
  /^citolog[ií]a conjuntival$/i, // Recuento = un solo "Descripción"; Conclusión = un solo "Interpretación"
  /^citolog[ií]a (de masa|masa adicional o contramuestra)$/i, // Evaluación = un solo "Descripción"; Conclusión = un solo "Interpretación"
]

// Una sección concreta de un examen concreto (cuando el nombre de la sección se repite en otros, ej. "Conclusión")
const DESCRIPTIVE_EXAM_SECTIONS: { exam: RegExp; section: RegExp }[] = [
  { exam: /^citolog[ií]a de l[ií]quidos/i, section: /^conclusi[oó]n$/i },
]

export function isDescriptiveSection(sectionName: string, examName = ""): boolean {
  const s = sectionName.trim(), e = examName.trim()
  return DESCRIPTIVE_SECTIONS.some(re => re.test(s))
    || DESCRIPTIVE_EXAMS.some(re => re.test(e))
    || DESCRIPTIVE_EXAM_SECTIONS.some(r => r.exam.test(e) && r.section.test(s))
}
