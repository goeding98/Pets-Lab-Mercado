// Sugerencias para "Morfología y Observaciones" del hemograma (Línea Roja, Línea Blanca, Serie Plaquetaria,
// Hemoparásitos): frases calculadas con los valores del hemograma contra el rango de la especie (y de la edad,
// lib/ageRanges.ts ya lo aplica a los campos) + botones de hallazgos del extendido. El doctor las toca y se
// agregan al texto en el mismo estilo que ya usa ("NEUTROFILIA LEVE. EQUINOCITOS: +."); siempre puede editarlo.
// Los grados son una guía: el texto final lo decide el doctor.

export const HEMO_TEXT_KEYS = ["linea_roja", "linea_blanca", "serie_plaquetaria", "hemoparasitos"] as const
export type HemoTextKey = (typeof HEMO_TEXT_KEYS)[number]
export const isHemoTextKey = (k: string | null): k is HemoTextKey => !!k && (HEMO_TEXT_KEYS as readonly string[]).includes(k)

// Valor numérico y rango (ya de la especie) de un parámetro del hemograma, por key
export type HemoReader = (key: string) => { value: number | null; ref: string | null }

function parseRange(ref: string | null): [number, number] | null {
  const m = ref?.match(/^([\d.]+)\s*[–-]\s*([\d.]+)/)
  return m ? [Number(m[1]), Number(m[2])] : null
}

type Dev = { dir: "low" | "high"; ratio: number } | null
function deviation(r: HemoReader, key: string): Dev {
  const { value, ref } = r(key)
  const range = parseRange(ref)
  if (value == null || !range) return null
  if (value < range[0]) return { dir: "low", ratio: range[0] > 0 ? value / range[0] : 0 }
  if (value > range[1]) return { dir: "high", ratio: range[1] > 0 ? value / range[1] : Infinity }
  return null
}
// Grado según cuánto se aleja del límite
const gradeHigh = (ratio: number) => (ratio <= 1.5 ? "LEVE" : ratio <= 2.5 ? "MODERADA" : "MARCADA")
const gradeLow = (ratio: number) => (ratio >= 0.75 ? "LEVE" : ratio >= 0.5 ? "MODERADA" : "MARCADA")
const grade = (d: NonNullable<Dev>) => (d.dir === "high" ? gradeHigh(d.ratio) : gradeLow(d.ratio))
// Absoluto si está (se calcula con el WBC), si no el %
const cellDev = (r: HemoReader, base: string) => (r(`${base}_absoluto`).value != null ? deviation(r, `${base}_absoluto`) : deviation(r, base))

// Frases calculadas con los valores, por casilla
export function autoSuggestions(key: HemoTextKey, r: HemoReader, species: string): string[] {
  const out: string[] = []
  if (key === "linea_roja") {
    const hct = deviation(r, "hematocrito") ?? deviation(r, "hemoglobina") ?? deviation(r, "recuento_total_de_eritrocitos_rbc")
    const mcv = deviation(r, "mcv_calculado")
    const mchc = deviation(r, "mchc_calculado")
    const hasMchc = r("mchc_calculado").value != null
    const size = mcv ? (mcv.dir === "low" ? "MICROCÍTICA" : "MACROCÍTICA") : r("mcv_calculado").value != null ? "NORMOCÍTICA" : ""
    const color = mchc?.dir === "low" ? "HIPOCRÓMICA" : hasMchc ? "NORMOCRÓMICA" : ""
    if (hct?.dir === "low") {
      // Anemia: leve ≥ 80% del mínimo, moderada ≥ 55%, severa por debajo (canino ~30/20 %, felino ~19/13 % de Hto)
      const g = hct.ratio >= 0.8 ? "LEVE" : hct.ratio >= 0.55 ? "MODERADA" : "SEVERA"
      const retic = r("reticulocitos")
      const regen = retic.value == null ? "" : deviation(r, "reticulocitos")?.dir === "high" ? "REGENERATIVA" : "NO REGENERATIVA"
      out.push(["ANEMIA", g, size, color, regen].filter(Boolean).join(" "))
    } else if (hct?.dir === "high") {
      out.push("ERITROCITOSIS")
      if (color) out.push(color)
    } else {
      if (mcv) out.push(mcv.dir === "low" ? "MICROCITOSIS" : "MACROCITOSIS")
      if (color) out.push(color === "HIPOCRÓMICA" ? "HIPOCROMÍA" : color)
    }
  }
  if (key === "linea_blanca") {
    const wbc = deviation(r, "recuento_total_de_leucocitos_wbc")
    if (wbc) out.push(`${wbc.dir === "high" ? "LEUCOCITOSIS" : "LEUCOPENIA"} ${grade(wbc)}`)
    const cells: [string, string, string | null][] = [
      ["neutrofilos", "NEUTROFILIA", "NEUTROPENIA"],
      ["linfocitos", "LINFOCITOSIS", "LINFOPENIA"],
      ["monocitos", "MONOCITOSIS", null],
      ["eosinofilos", "EOSINOFILIA", null],
      ["basofilos", "BASOFILIA", null],
    ]
    for (const [base, hi, lo] of cells) {
      const d = cellDev(r, base)
      if (d?.dir === "high") out.push(`${hi} ${grade(d)}`)
      else if (d?.dir === "low" && lo) out.push(`${lo} ${grade(d)}`)
    }
    const bands = r("bandas_absoluto").value
    if (cellDev(r, "bandas")?.dir === "high") {
      const g = bands == null ? "LEVE" : bands < 1 ? "LEVE" : bands < 5 ? "MODERADA" : "MARCADA"
      out.push(`DESVIACIÓN A LA IZQUIERDA ${g}`)
    }
    if (out.length === 0 && r("recuento_total_de_leucocitos_wbc").value != null) out.push("DISTRIBUCIÓN NORMAL")
  }
  if (key === "serie_plaquetaria") {
    const plt = deviation(r, "recuento_total_de_plaquetas_plt")
    if (plt?.dir === "low") out.push(`TROMBOCITOPENIA ${grade(plt)} CONFIRMADA EN EL EXTENDIDO`)
    else if (plt?.dir === "high") out.push(`TROMBOCITOSIS ${grade(plt)}`)
    else if (r("recuento_total_de_plaquetas_plt").value != null) out.push("DISTRIBUCIÓN NORMAL")
  }
  if (key === "hemoparasitos") {
    out.push(`NEGATIVO PARA VISUALIZACIÓN INTRACITOPLASMÁTICA DE HEMATOZOARIOS/${species === "Felino" ? "Mycoplasma sp" : "Rickettsia"}`)
  }
  return out
}

// Hallazgos del extendido: "graded" = se agrega "NOMBRE: +" y cada clic sube a ++ / +++ y luego lo quita
export type Chip = { label: string; text: string; graded?: boolean; askPercent?: boolean }
export const MORPHO_CHIPS: Record<HemoTextKey, Chip[]> = {
  linea_roja: [
    "ANISOCITOSIS", "POLICROMATOFILIA", "HIPOCROMÍA", "EQUINOCITOS", "ACANTOCITOS", "ESQUISTOCITOS", "CODOCITOS",
    "ESFEROCITOS", "EXCENTROCITOS", "FENÓMENO DE ROULEAUX", "AGLUTINACIÓN", "CUERPOS DE HOWELL-JOLLY", "CUERPOS DE HEINZ",
    "METARRUBRICITOS",
  ].map(n => ({ label: n, text: n, graded: true })),
  linea_blanca: [
    { label: "Linfocitos reactivos %", text: "LINFOCITOS REACTIVOS EN UN", askPercent: true },
    { label: "Toxicidad grado I", text: "SIGNOS DE TOXICIDAD: (GRADO I. LEVE) NEUTRÓFILOS Y BANDAS CON BASOFILIA CITOPLASMÁTICA" },
    { label: "Toxicidad grado II", text: "SIGNOS DE TOXICIDAD: (GRADO II. MODERADA) NEUTRÓFILOS Y BANDAS CON BASOFILIA Y VACUOLIZACIÓN CITOPLASMÁTICA" },
    { label: "Toxicidad grado III", text: "SIGNOS DE TOXICIDAD: (GRADO III. MARCADA) NEUTRÓFILOS Y BANDAS CON BASOFILIA Y VACUOLIZACIÓN CITOPLASMÁTICA" },
    { label: "Neutrófilos hipersegmentados", text: "NEUTRÓFILOS HIPERSEGMENTADOS" },
  ],
  serie_plaquetaria: ["MACROPLAQUETAS", "AGREGADOS PLAQUETARIOS", "MEGACARIOPLAQUETAS"].map(n => ({ label: n, text: n, graded: true })),
  hemoparasitos: [
    { label: "Ehrlichia", text: "POSITIVO PARA VISUALIZACIÓN DE MÓRULAS COMPATIBLES CON Ehrlichia sp. EN MONONUCLEARES" },
    { label: "Anaplasma platys", text: "POSITIVO PARA VISUALIZACIÓN DE INCLUSIONES COMPATIBLES CON Anaplasma platys EN PLAQUETAS" },
    { label: "Anaplasma (neutrófilos)", text: "POSITIVO PARA VISUALIZACIÓN DE MÓRULAS COMPATIBLES CON Anaplasma sp. EN NEUTRÓFILOS" },
    { label: "Babesia", text: "POSITIVO PARA VISUALIZACIÓN DE ESTRUCTURAS COMPATIBLES CON Babesia sp. EN ERITROCITOS" },
    { label: "Mycoplasma", text: "POSITIVO PARA VISUALIZACIÓN DE ESTRUCTURAS EPIERITROCÍTICAS COMPATIBLES CON Mycoplasma sp." },
    { label: "Hepatozoon", text: "POSITIVO PARA VISUALIZACIÓN DE GAMONTES COMPATIBLES CON Hepatozoon sp. EN NEUTRÓFILOS" },
  ],
}

// ── Edición del texto ────────────────────────────────────────────────────────────────────────────────
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const tidy = (s: string) => s.replace(/\s{2,}/g, " ").replace(/^\s*\.\s*/, "").trim()

export const hasPhrase = (text: string, phrase: string) => text.toUpperCase().includes(phrase.toUpperCase())

export function addPhrase(text: string, phrase: string): string {
  if (hasPhrase(text, phrase)) return text
  const t = text.trim()
  return t ? `${/[.:]$/.test(t) ? t : `${t}.`} ${phrase}.` : `${phrase}.`
}

// Quita la frase (y su punto)
export function removePhrase(text: string, phrase: string): string {
  return tidy(text.replace(new RegExp(`${esc(phrase)}[^.]*\\.?`, "i"), ""))
}

export const togglePhrase = (text: string, phrase: string) => (hasPhrase(text, phrase) ? removePhrase(text, phrase) : addPhrase(text, phrase))

// Cruces actuales de un hallazgo ("EQUINOCITOS: ++" → 2), 0 si no está
export function gradeOf(text: string, name: string): number {
  const m = text.match(new RegExp(`${esc(name)}\\s*:?\\s*(\\+{1,3})`, "i"))
  return m ? m[1].length : hasPhrase(text, name) ? 1 : 0
}

// + → ++ → +++ → se quita
export function cycleGrade(text: string, name: string): string {
  const n = gradeOf(text, name)
  const re = new RegExp(`${esc(name)}\\s*:?\\s*\\+{0,3}\\.?`, "i")
  if (n === 0) return addPhrase(text, `${name}: +`)
  if (n >= 3) return tidy(text.replace(re, ""))
  return text.replace(re, `${name}: ${"+".repeat(n + 1)}.`)
}
