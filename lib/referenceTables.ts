// Tablas de referencia fijas que se muestran al final de un examen (formulario y PDF), para rangos
// que no caben en Ref. Can. / Ref. Fel. porque dependen de una condición (ej. ayuno vs. posprandial).
// Se eligen por el nombre del examen. Solo caracteres Latin-1 (el PDF usa Helvetica); ojo: título y
// columnas salen en mayúsculas, así que nada de "µ" ahí (su mayúscula no existe en Helvetica).
export type ReferenceTable = {
  title: string
  columns: string[]
  rows: string[][]
  note?: string // nota fija debajo de la tabla (ej. interferencias)
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
  {
    exam: /^sdma$/i,
    table: {
      title: "Valores de referencia SDMA",
      columns: ["Resultado", "Interpretación"],
      rows: [
        ["<= 14 ug/dL", "Normal"],
        ["14.1 – 19.9 ug/dL", "Elevado (comprobar evidencia de enfermedad renal)"],
        ["> 20.0 ug/dL", "Probabilidad de enfermedad renal"],
      ],
      note: "La hemólisis y la lipemia de los sueros producen alteración en los resultados de las pruebas enzimáticas.",
    },
  },
]

export function referenceTableFor(examName: string): ReferenceTable | null {
  return TABLES.find(t => t.exam.test(examName.trim()))?.table ?? null
}
