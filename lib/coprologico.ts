// Coprológico: resultado estructurado (no por campos). Lo usan el formulario de captura
// (components/CoproForm.tsx) y el PDF (components/PdfReport.tsx). Se guarda en OrderExam.structured
// bajo la clave "copro". La sección marcador del examen (y de los perfiles que lo incluyen) se llama
// "Coprológico" y no tiene campos. Sin imports de servidor: se usa también en el navegador.
//
// Texto con formato: **negrita** y *cursiva* (nombres científicos). Solo caracteres Latin-1: el PDF
// usa Helvetica.

// "Coprológico" en el examen y en los perfiles; "<examen> — Coprológico" si viene dentro de una promoción
export const isCoproSection = (sectionName: string) => /(^|— )coprol[oó]gico$/i.test(sectionName.trim())

export const CONSISTENCIA = ["Formada", "Pastosa", "Blanda", "Semilíquida", "Líquida"]
export const COLOR = ["Marrón", "Marrón oscuro", "Amarillo", "Verde", "Negro / melena", "Rojizo", "Gris / arcilla", "Otro"]
export const PRESENCIA = ["Ausente", "Presente - escasa", "Presente - moderada", "Presente - abundante"]
export const CANTIDAD = ["+", "++", "+++"]
export const MICROBIOTA = ["Normal", "Ligeramente aumentada", "Aumentada", "Disminuida"]
export const CRUCES = ["Negativo", "+", "++", "+++"]
export const LEUCOCITOS_DEFAULT = "Se observan __ por campo de 40X"

// Hallazgos de protozoos sugeridos (con formato: el género va en cursiva)
export const PROTOZOOS = [
  "*Giardia sp.* (quistes)",
  "*Giardia sp.* (trofozoítos)",
  "Coccidias / *Cystoisospora sp.*",
  "*Entamoeba sp.*",
]

// Parásitos sugeridos en la flotación (el nombre completo sale en cursiva)
export const PARASITOS_FLOTACION = [
  "Ancylostoma sp.", "Toxocara canis", "Toxocara cati", "Toxascaris leonina", "Trichuris vulpis",
  "Dipylidium caninum", "Taenia sp.", "Strongyloides sp.", "Cystoisospora sp.",
]

export const TECNICA_DEFAULT = "Frotis directo – Miniflotac – Flotación con solución saturada"
export const NOTA_FIJA = "La interpretación de este examen de laboratorio corresponde única y exclusivamente al médico veterinario."


export type CoproData = {
  consistencia: string
  color: string
  colorOtro: string
  sangre: string
  moco: string
  parasitosAdultos: string
  otros: string
  // Examen microscópico (tabla de 2 columnas; igual en Coprológico y Coproscópico)
  microbiota: string
  globulosRojos: string
  restos: string
  leucocitos: string
  levaduras: string
  protozoos: { ninguno: boolean; items: { hallazgo: string; cantidad: string }[] }
  microOtros: string
  flotacion: { ninguno: boolean; items: { parasito: string; hpg: string }[] }
  tecnica: string
  observaciones: string
  fecha: string // fecha de la muestra (YYYY-MM-DD, opcional; en el Coprológico Seriado cada muestra es de un día)
}

export const COPRO_DEFAULT: CoproData = {
  consistencia: "",
  color: "",
  colorOtro: "",
  sangre: "Ausente",
  moco: "Ausente",
  parasitosAdultos: "No se observan",
  otros: "",
  microbiota: "Normal",
  globulosRojos: "Negativo",
  restos: "Negativo",
  leucocitos: LEUCOCITOS_DEFAULT,
  levaduras: "Negativo",
  protozoos: { ninguno: true, items: [] },
  microOtros: "",
  flotacion: { ninguno: true, items: [] },
  tecnica: TECNICA_DEFAULT,
  observaciones: "",
  fecha: "",
}

const str = (v: unknown, max = 4000) => (typeof v === "string" ? v.slice(0, max) : "")

// Normaliza lo que venga de la base o del navegador (campos faltantes -> valor por defecto)
export function readCopro(structured: unknown): CoproData {
  const raw = structured && typeof structured === "object" ? (structured as Record<string, unknown>).copro : null
  return normalizeCopro(raw)
}

// Coprológico Seriado (y cualquier examen con varias secciones "… — Coprológico"): el bloque 1 va en
// structured.copro (igual que un coprológico normal) y el bloque i en structured.coproSerie[i]. La foto de
// la muestra del bloque 1 es role "COPRO_MACRO"; la del bloque i, "COPRO_MACRO_<i+1>".
export function readCoproAt(structured: unknown, i: number): CoproData {
  if (i === 0) return readCopro(structured)
  const serie = structured && typeof structured === "object" ? (structured as Record<string, unknown>).coproSerie : null
  return normalizeCopro(Array.isArray(serie) ? serie[i] : null)
}
export const readCoproSerie = (structured: unknown, n: number) => Array.from({ length: Math.max(1, n) }, (_, i) => readCoproAt(structured, i))
export const coproPhotoRole = (i: number) => (i === 0 ? "COPRO_MACRO" : `COPRO_MACRO_${i + 1}`)
export const isCoproPhotoRole = (role: string | null | undefined) => !!role && /^COPRO_MACRO(_\d{1,2})?$/.test(role)

export function normalizeCopro(input: unknown): CoproData {
  const raw = (input && typeof input === "object" ? input : null) as Record<string, unknown> | null
  if (!raw) return structuredClone(COPRO_DEFAULT)
  const list = <T,>(v: unknown, map: (x: Record<string, unknown>) => T): T[] =>
    Array.isArray(v) ? v.slice(0, 30).filter(x => x && typeof x === "object").map(x => map(x as Record<string, unknown>)) : []
  const block = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {})
  const proto = block(raw.protozoos), flot = block(raw.flotacion)
  const D = COPRO_DEFAULT
  const pick = (v: unknown, options: string[], fallback: string) => (typeof v === "string" && options.includes(v) ? v : fallback)
  return {
    consistencia: str(raw.consistencia, 100),
    color: str(raw.color, 100),
    colorOtro: str(raw.colorOtro, 200),
    sangre: str(raw.sangre, 100) || COPRO_DEFAULT.sangre,
    moco: str(raw.moco, 100) || COPRO_DEFAULT.moco,
    parasitosAdultos: typeof raw.parasitosAdultos === "string" ? str(raw.parasitosAdultos, 500) : COPRO_DEFAULT.parasitosAdultos,
    otros: str(raw.otros, 1000),
    microbiota: pick(raw.microbiota, MICROBIOTA, D.microbiota),
    globulosRojos: pick(raw.globulosRojos, CRUCES, D.globulosRojos),
    restos: pick(raw.restos, CRUCES, D.restos),
    leucocitos: typeof raw.leucocitos === "string" ? str(raw.leucocitos, 300) : D.leucocitos,
    levaduras: pick(raw.levaduras, CRUCES, D.levaduras),
    protozoos: {
      ninguno: proto.ninguno !== false,
      items: list(proto.items, x => ({ hallazgo: str(x.hallazgo, 200), cantidad: str(x.cantidad, 10) })),
    },
    microOtros: str(raw.microOtros, 2000),
    flotacion: {
      ninguno: flot.ninguno !== false,
      items: list(flot.items, x => ({ parasito: str(x.parasito, 200), hpg: str(x.hpg, 20) })),
    },
    tecnica: typeof raw.tecnica === "string" ? str(raw.tecnica, 300) : TECNICA_DEFAULT,
    observaciones: str(raw.observaciones, 4000),
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(str(raw.fecha, 10)) ? str(raw.fecha, 10) : "",
  }
}

export const colorLabel = (d: CoproData) => (d.color === "Otro" ? d.colorOtro.trim() || "Otro" : d.color)

// **negrita** y *cursiva* -> segmentos para pintar en la página o en el PDF
export type Segment = { text: string; bold: boolean; italic: boolean }
export function parseMarkup(input: string): Segment[] {
  const out: Segment[] = []
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g
  let last = 0
  for (const m of input.matchAll(re)) {
    if (m.index! > last) out.push({ text: input.slice(last, m.index), bold: false, italic: false })
    if (m[2] !== undefined) out.push({ text: m[2], bold: true, italic: false })
    else out.push({ text: m[3], bold: false, italic: true })
    last = m.index! + m[0].length
  }
  if (last < input.length) out.push({ text: input.slice(last), bold: false, italic: false })
  return out
}
export const stripMarkup = (s: string) => s.replace(/\*\*([^*]+)\*\*|\*([^*]+)\*/g, (_m, b, i) => b ?? i)

// ── Coproscópico = todo el Coprológico (macro + Examen microscópico) + tabla "Coproscópico" ─────
// La tabla se guarda en OrderExam.structured.coproscopico (lo del coprológico va en .copro).
// "<examen> — Coproscópico" si viene dentro de una promoción; la sección de "Sangre Oculta en Heces"
// se llama "Sangre Oculta" para no confundirse.
export const isCoproscopicoSection = (sectionName: string) => /(^|— )coprosc[oó]pico$/i.test(sectionName.trim())

export const POSITIVO_CRUCES = ["Negativo", "Positivo +", "Positivo ++", "Positivo +++"]
export const SANGRE_OCULTA = ["Negativo", "Positivo"]

export const GRAM = [
  { key: "bacilosGramPos", label: "Bacilos Gram positivos" },
  { key: "bacilosGramNeg", label: "Bacilos Gram negativos" },
  { key: "cocosGramPos", label: "Cocos Gram positivos" },
  { key: "cocosGramNeg", label: "Cocos Gram negativos" },
  { key: "cocobacilosGramNeg", label: "Cocobacilos Gram negativos" },
] as const
export type GramKey = (typeof GRAM)[number]["key"]

export type CoproscopicoData = {
  ph: string
  almidones: string
  grasa: string
  sangreOculta: string
  gram: Record<GramKey, string>
  gramOtros: string
}

export const COPROSCOPICO_DEFAULT: CoproscopicoData = {
  ph: "",
  almidones: "Negativo",
  grasa: "Negativo",
  sangreOculta: "Negativo",
  gram: { bacilosGramPos: "Negativo", bacilosGramNeg: "Negativo", cocosGramPos: "Negativo", cocosGramNeg: "Negativo", cocobacilosGramNeg: "Negativo" },
  gramOtros: "",
}

export function readCoproscopico(structured: unknown): CoproscopicoData {
  const raw = (structured && typeof structured === "object" ? (structured as Record<string, unknown>).coproscopico : null) as Record<string, unknown> | null
  if (!raw || typeof raw !== "object") return structuredClone(COPROSCOPICO_DEFAULT)
  const D = COPROSCOPICO_DEFAULT
  const pick = (v: unknown, options: string[], fallback: string) => (typeof v === "string" && options.includes(v) ? v : fallback)
  const block = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {})
  const gram = block(raw.gram)
  return {
    ph: str(raw.ph, 10),
    almidones: pick(raw.almidones, POSITIVO_CRUCES, D.almidones),
    grasa: pick(raw.grasa, POSITIVO_CRUCES, D.grasa),
    sangreOculta: pick(raw.sangreOculta, SANGRE_OCULTA, D.sangreOculta),
    gram: Object.fromEntries(GRAM.map(g => [g.key, pick(gram[g.key], CRUCES, "Negativo")])) as Record<GramKey, string>,
    gramOtros: str(raw.gramOtros, 2000),
  }
}

// pH: número con 1 decimal entre 4 y 9 (vacío = sin dato)
export function phError(ph: string): string | null {
  if (!ph.trim()) return null
  const n = Number(ph.replace(",", "."))
  if (!Number.isFinite(n)) return "El pH debe ser un número"
  if (n < 4 || n > 9) return "El pH debe estar entre 4 y 9"
  return null
}
export const phLabel = (ph: string) => {
  const n = Number(ph.replace(",", "."))
  return ph.trim() && Number.isFinite(n) ? n.toFixed(1) : ""
}

// Frase de Wright / Gram solo con lo no negativo: "Bacilos Gram positivos (++), cocos Gram negativos (+)."
export function gramPhrase(d: CoproscopicoData): string {
  const parts = GRAM.filter(g => d.gram[g.key] !== "Negativo").map(g => `${g.label} (${d.gram[g.key]})`)
  if (parts.length === 0) return ""
  const text = parts.map((p, i) => (i === 0 ? p : p.charAt(0).toLowerCase() + p.slice(1))).join(", ")
  return `${text}.`
}
