// Secciones de texto libre (ej. "Morfología y Observaciones" del hemograma, también dentro de
// los perfiles como "Hemograma Completo — Morfología y Observaciones"): no tienen unidad, rangos
// ni técnica, así que en el formulario y en el PDF se muestran solo como Parámetro + Descripción.
export function isDescriptiveSection(sectionName: string): boolean {
  return /morfolog[ií]a y observaciones/i.test(sectionName)
}
