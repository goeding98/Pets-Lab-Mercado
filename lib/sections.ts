// Secciones de texto libre: no tienen unidad, rangos ni técnica, así que en el formulario y en el
// PDF se muestran solo como Parámetro + Descripción (filas más altas). Son:
// - "Morfología y Observaciones" del hemograma (en los perfiles: "Hemograma Completo — Morfología…")
// - "Hemoparásitos" (Frotis Extendido y Gota Gruesa), también copiada dentro de los perfiles
// - todo el examen "Extendido de Sangre Periférica" (incluida su "Conclusión"; la "Conclusión" de
//   las citologías no entra porque se decide por el nombre del examen)
const DESCRIPTIVE_SECTIONS = [/morfolog[ií]a y observaciones/i, /^hemopar[aá]sitos$/i, /^extendido de sangre perif[eé]rica$/i]
const DESCRIPTIVE_EXAMS = [/gota gruesa/i, /^extendido de sangre perif[eé]rica$/i]

export function isDescriptiveSection(sectionName: string, examName = ""): boolean {
  return DESCRIPTIVE_SECTIONS.some(re => re.test(sectionName.trim())) || DESCRIPTIVE_EXAMS.some(re => re.test(examName.trim()))
}
