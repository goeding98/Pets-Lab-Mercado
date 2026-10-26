// Equipo de química A15: equivalencia de sus "técnicas" con los parámetros de Petslab (ExamField.key) y
// lectura de la tabla "Resultados muestra" que el microbiólogo copia como captura de pantalla. La foto se lee
// en el navegador (OCR, muestras/[id]/A15Import.tsx) y los valores se pasan a los formularios pendientes de la
// muestra con el evento A15_EVENT; ahí se revisan/editan y se guardan como siempre.

export type A15Tech = {
  name: string // como lo muestra el equipo
  key: string | null // ExamField.key en Petslab (null = no lo usamos)
  label: string
  gPerL?: boolean // el equipo lo da en g/L; Petslab lo usa en g/dL (÷ 10)
}

export const A15_TECHS: A15Tech[] = [
  { name: "ALBUMIN", key: "albumina", label: "Albúmina", gPerL: true },
  { name: "ALP-AMP", key: "fosfatasa_alcalina_alkp", label: "Fosfatasa Alcalina" },
  { name: "ALT", key: "alt_gpt", label: "ALT/GPT" },
  { name: "AST", key: "ast_got", label: "AST/GOT" },
  { name: "BILI DIRECT DPD", key: "bilirrubina_directa", label: "Bilirrubina Directa" },
  { name: "BILI TOTAL DPD", key: "bilirrubina_total", label: "Bilirrubina Total" },
  { name: "CALCIUM ARSENAZO", key: "calcio", label: "Calcio" },
  { name: "CHOLESTEROL", key: "colesterol", label: "Colesterol" },
  { name: "CREATININE", key: "creatinina", label: "Creatinina" },
  { name: "g-GT", key: "ggt", label: "GGT" },
  { name: "GLUCOSE", key: "glucosa", label: "Glucosa" },
  { name: "LIPASE", key: "lipasa", label: "Lipasa" },
  { name: "PHOSPHORUS", key: "fosforo", label: "Fósforo" },
  { name: "PROTEIN TOTAL", key: "proteinas_totales", label: "Proteínas Totales", gPerL: true },
  { name: "TRIGLYCERIDES", key: "trigliceridos", label: "Triglicéridos" },
  { name: "UREA UV", key: "urea", label: "Urea" },
  { name: "AMYLASE DIRECT", key: "amilasa", label: "Amilasa" },
  { name: "FRUCTOSAMINE", key: "fructosamina", label: "Fructosamina" },
  { name: "ALBUMIN/GLOBULIN RATIO", key: null, label: "Relación A/G" }, // el equipo la redondea a 0; Petslab la calcula
  { name: "BUN", key: "nitrogeno_ureico_bun", label: "Nitrógeno Ureico (BUN)" },
  { name: "BUN/CREATININE", key: null, label: "Relación BUN/Creatinina" },
  { name: "GLOBULIN", key: "globulinas", label: "Globulinas", gPerL: true },
  { name: "INDIRECT BILIRUB DPD", key: "bilirrubina_indirecta", label: "Bilirrubina Indirecta" },
  { name: "VLDL 2", key: null, label: "VLDL" },
]

export const A15_KEYS = new Set(A15_TECHS.flatMap(t => (t.key ? [t.key] : [])))

// Exámenes donde un mismo key NO es química de suero (ej. glucosa/albúmina del Citoquímico de Líquido)
export const isA15Excluded = (examOrSection: string) => /citoqu|l[ií]quido|efusi|orina/i.test(examOrSection)

// Clave de un campo para el A15: las promociones renombran los repetidos (key__2)
export const a15KeyOf = (key: string | null) => (key ? key.replace(/__\d+$/, "") : null)

// Evento que la ventana de importación lanza y cada ExamResultForm escucha. Los formularios anotan en
// `report` qué llenaron (el evento se despacha síncrono, así la ventana muestra el resultado enseguida).
export const A15_EVENT = "petslab:a15"
export type A15FillReport = { key: string; exam: string; status: "llenado" | "calculado" | "bloqueado" }
export type A15EventDetail = { values: Record<string, string>; report: A15FillReport[] }

// ── Lectura de la tabla ───────────────────────────────────────────────────────────────────────────
const compact = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "")

function lev(a: string, b: string) {
  const d = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]
    d[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j]
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return d[b.length]
}

// Técnica del A15 que corresponde a un nombre leído (tolera errores del OCR y nombres cortados "ALBUMIN/GLOBULIN R...")
export function matchTech(raw: string): A15Tech | null {
  const name = compact(raw)
  if (name.length < 2) return null
  const truncated = /\.\.\.|…/.test(raw)
  let best: { t: A15Tech; d: number } | null = null
  for (const t of A15_TECHS) {
    const full = compact(t.name)
    let d = lev(name, full)
    if ((truncated || name.length >= 8) && full.length > name.length) d = Math.min(d, lev(name, full.slice(0, name.length)) + (truncated ? 0 : 1))
    if (!best || d < best.d || (d === best.d && full.length > compact(best.t.name).length)) best = { t, d }
  }
  if (!best) return null
  const allowed = name.length <= 4 ? 0 : Math.max(1, Math.floor(name.length * 0.3))
  return best.d <= allowed ? best.t : null
}

// "13,95" → "13.95"; null si no es un número
export function cleanNumber(raw: string): string | null {
  const s = raw.trim().replace(",", ".").replace(/[^0-9.\-]/g, "")
  return /^-?\d+(\.\d+)?$/.test(s) ? String(Number(s)) : null
}

// Columna "TIPO" de la tabla (SER = suero; el OCR a veces lee SFR, 5ER…)
export const isTypeToken = (w: string) => /^([S5][EF][RP]|PLA|URI|CSF|SAN)$/i.test(w.trim())

// Valor en la unidad de Petslab: g/L → g/dL para albúmina, proteínas y globulinas
export function toPetslab(t: A15Tech, value: string, unitRead: string): string {
  const u = unitRead.toLowerCase().replace(/\s/g, "")
  const inGPerL = t.gPerL && !u.includes("dl") // si el equipo se configura en g/dL no se convierte
  if (!inGPerL) return value
  return String(Math.round((Number(value) / 10) * 100) / 100)
}
