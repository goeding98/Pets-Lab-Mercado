// Secciones de texto libre: no tienen unidad, rangos ni técnica, así que en el formulario y en el
// PDF se muestran solo como Parámetro + Descripción (filas más altas). Son:
// - "Morfología y Observaciones" del hemograma (en los perfiles: "Hemograma Completo — Morfología…")
// - "Hemoparásitos" (Frotis Extendido y Gota Gruesa), también copiada dentro de los perfiles
// - todo el examen "Extendido de Sangre Periférica" (incluida su "Conclusión"; la "Conclusión" de
//   las citologías no entra porque se decide por el nombre del examen)
// - todo el examen "Citología de Piel" (en el Perfil Dermatológico: "Citología de Piel — …")
// - "Test de Héller (Proteinuria Cualitativa)" y "Coloración de Wright (Sedimento Urinario)" del
//   Parcial de Orina, y "Coloración de Wright (Heces)" del Coproscópico (no la de Malassezia, que tiene rangos)
const DESCRIPTIVE_SECTIONS = [
  /morfolog[ií]a y observaciones/i,
  /^hemopar[aá]sitos$/i,
  /^extendido de sangre perif[eé]rica$/i,
  /^citolog[ií]a de piel —/i,
  /test de h[eé]ller/i, // Parcial de Orina (y su copia en los perfiles)
  /coloraci[oó]n de wright \((sedimento urinario|heces)\)/i, // Parcial de Orina (y perfiles) y Coproscópico
]
const DESCRIPTIVE_EXAMS = [/gota gruesa/i, /^extendido de sangre perif[eé]rica$/i, /^citolog[ií]a de piel$/i]

export function isDescriptiveSection(sectionName: string, examName = ""): boolean {
  return DESCRIPTIVE_SECTIONS.some(re => re.test(sectionName.trim())) || DESCRIPTIVE_EXAMS.some(re => re.test(examName.trim()))
}
