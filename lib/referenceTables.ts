// Tablas de referencia fijas que se muestran al final de un examen (formulario y PDF), para rangos
// que no caben en Ref. Can. / Ref. Fel. porque dependen de una condición (ej. ayuno vs. posprandial).
// Se eligen por el nombre del examen. Solo caracteres Latin-1 (el PDF usa Helvetica); ojo: título y
// columnas salen en mayúsculas, así que nada de "µ" ahí (su mayúscula no existe en Helvetica).
export type ReferenceTable = {
  title: string
  columns: string[]
  rows: string[][]
}

const TABLES: { exam: RegExp; table: ReferenceTable }[] = [
  {
    exam: /^[aá]cidos biliares$/i,
    table: {
      title: "BA - Referencia de patología",
      columns: ["Condición", "Caninos", "Felinos"],
      rows: [
        ["Preprandial", "0 – 14.9 µmol/L", "0 – 6.9 µmol/L"],
        ["Postprandial", "0 – 29.0 µmol/L", "0 – 14.9 µmol/L"],
      ],
    },
  },
]

export function referenceTableFor(examName: string): ReferenceTable | null {
  return TABLES.find(t => t.exam.test(examName.trim()))?.table ?? null
}
