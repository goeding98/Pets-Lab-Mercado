// Parcial de Orina (citoquímico): resultado estructurado, como el Coprológico. Formulario
// components/OrinaForm.tsx, PDF OrinaPdf en components/PdfReport.tsx. Se guarda en
// OrderExam.structured.orina. Los valores de referencia por especie y los cortes del UPC NO están
// fijos aquí: viven en LabSetting "orina" (editable en /rangos); ORINA_CONFIG_DEFAULT es solo el
// valor inicial. Sin imports de servidor. Solo Latin-1 en textos (el PDF usa Helvetica).

// Sección marcador en el examen y en los perfiles ("<examen> — Parcial de Orina" en promociones)
export const isOrinaSection = (sectionName: string) => /(^|— )parcial de orina$/i.test(sectionName.trim())

export const METODO_RECOLECCION = ["Cistocentesis", "Micción espontánea", "Sondaje", "Recolección del piso / caja"]
export const COLOR_ORINA = ["Amarillo claro", "Amarillo", "Amarillo oscuro / ámbar", "Rojizo", "Marrón", "Verdoso", "Incolora", "Otro"]
export const ASPECTO = ["Transparente", "Ligeramente turbio", "Turbio"]
export const OLOR = ["S.G.", "Amoniacal", "Fétido", "Dulce / cetónico", "No evaluado"]
export const TIRA = ["Negativo", "Trazas", "+", "++", "+++"]
export const PROTEINAS = ["Negativo", "Trazas (10 mg/dL)", "+ (30 mg/dL)", "++ (100 mg/dL)", "+++ (>=300 mg/dL)"]
const PROTEINA_MG_DL: Record<string, number> = { Negativo: 0, "Trazas (10 mg/dL)": 10, "+ (30 mg/dL)": 30, "++ (100 mg/dL)": 100, "+++ (>=300 mg/dL)": 300 }
export const HELLER = ["Negativo", "Positivo +", "Positivo ++", "Positivo +++"]
export const ANILLO_HELLER = ["Negativo", "Positivo"]
export const CANTIDAD_SEDIMENTO = ["Escaso", "Moderado", "Abundante"]
export const POR_CAMPO = ["0–2", "3–5", "5–10", ">10"]
export const BACTERIAS_GRADO = ["Negativo", "+/-", "+", "++", "+++"]
export const BACTERIAS_TIPO = ["Cocos", "Bacilos", "Mixtas"]
export const BACTERIAS_UBICACION = ["Libres", "Fagocitadas"]
export const CILINDROS = ["Hialinos", "Granulosos", "Céreos", "Celulares"]
export const CRISTALES = ["Estruvita", "Oxalato de calcio monohidratado", "Oxalato de calcio dihidratado", "Urato de amonio", "Bilirrubina", "Cistina"]
export const CRUCES = ["+", "++", "+++"]
export const METODOS_DEFAULT = "Sedimento por microscopía óptica, tinción de Wright y refractometría"
export const NOTA_ORINA = "Se recomienda muestra por CISTOCENTESIS. La interpretación de este examen de laboratorio corresponde única y exclusivamente al médico veterinario."
export const LEYENDA_BACTERIAS = "Bacterias: +/- (2–5 por AP) · + (5–9 por AP) · ++ (10–40 por AP) · +++ (>50 por AP)"

// ── Configuración (valores de referencia por especie y cortes del UPC) ────────────────────────────
export type Species = "canino" | "felino"
export type CatRef = { texto: string; normales: string[] } // resultado categórico: qué valores son normales
export type NumRef = { texto: string; min: number | null; max: number | null }
export const CAT_PARAMS = ["color", "aspecto", "olor", "glucosa", "bilirrubina", "cetonas", "sangre", "nitritos", "leucocitos", "proteinas"] as const
export const NUM_PARAMS = ["densidad", "ph", "urobilinogeno", "creatinina"] as const
export type CatParam = (typeof CAT_PARAMS)[number]
export type NumParam = (typeof NUM_PARAMS)[number]
export type SpeciesRefs = Record<CatParam, CatRef> & Record<NumParam, NumRef>
export type OrinaConfig = {
  ref: Record<Species, SpeciesRefs>
  upc: Record<Species, { limitrofe: number; proteinurico: number }> // < limitrofe: no proteinúrico; > proteinurico: proteinúrico
}

export const PARAM_LABEL: Record<CatParam | NumParam, string> = {
  color: "Color", aspecto: "Aspecto", olor: "Olor", densidad: "Densidad (refractometría)",
  glucosa: "Glucosa", bilirrubina: "Bilirrubina", cetonas: "Cetonas", sangre: "Sangre", nitritos: "Nitritos",
  leucocitos: "Leucocitos", ph: "pH", proteinas: "Proteínas", urobilinogeno: "Urobilinógeno (mg/dL)", creatinina: "Creatinina urinaria (mg/dL)",
}
export const PARAM_OPTIONS: Record<CatParam, string[]> = {
  color: COLOR_ORINA, aspecto: ASPECTO, olor: OLOR, glucosa: TIRA, bilirrubina: TIRA, cetonas: TIRA,
  sangre: TIRA, nitritos: TIRA, leucocitos: TIRA, proteinas: PROTEINAS,
}

const neg = (): CatRef => ({ texto: "Negativo", normales: ["Negativo"] })
const baseRefs = (): SpeciesRefs => ({
  color: { texto: "Amarillo", normales: ["Amarillo claro", "Amarillo", "Amarillo oscuro / ámbar"] },
  aspecto: { texto: "Transparente", normales: ["Transparente"] },
  olor: { texto: "S.G.", normales: ["S.G.", "No evaluado"] },
  glucosa: neg(), bilirrubina: neg(), cetonas: neg(), sangre: neg(), nitritos: neg(), leucocitos: neg(),
  proteinas: { texto: "Negativo – Trazas", normales: ["Negativo", "Trazas (10 mg/dL)"] },
  densidad: { texto: "1.015 – 1.045", min: 1.015, max: 1.045 },
  ph: { texto: "5.5 – 6.0", min: 5.5, max: 6 },
  urobilinogeno: { texto: "< 1.0 mg/dL", min: null, max: 1 },
  creatinina: { texto: "—", min: null, max: null },
})
export const ORINA_CONFIG_DEFAULT: OrinaConfig = {
  ref: {
    canino: { ...baseRefs(), bilirrubina: { texto: "Negativo – Trazas", normales: ["Negativo", "Trazas"] } },
    felino: { ...baseRefs(), densidad: { texto: "1.035 – 1.060", min: 1.035, max: 1.06 } },
  },
  upc: { canino: { limitrofe: 0.2, proteinurico: 0.5 }, felino: { limitrofe: 0.2, proteinurico: 0.4 } },
}

// Normaliza la configuración guardada (lo que falte toma el valor por defecto)
export function readOrinaConfig(raw: unknown): OrinaConfig {
  const D = ORINA_CONFIG_DEFAULT
  const o = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {})
  const num = (v: unknown, fb: number | null) => (typeof v === "number" && Number.isFinite(v) ? v : v === null ? null : fb)
  const r = o(raw), ref = o(r.ref), upc = o(r.upc)
  const species = (sp: Species) => {
    const s = o(ref[sp])
    const out = {} as SpeciesRefs
    for (const p of CAT_PARAMS) {
      const x = o(s[p]), d = D.ref[sp][p]
      out[p] = {
        texto: typeof x.texto === "string" ? x.texto.slice(0, 120) : d.texto,
        normales: Array.isArray(x.normales) ? x.normales.filter((n): n is string => typeof n === "string" && PARAM_OPTIONS[p].includes(n)) : d.normales,
      }
    }
    for (const p of NUM_PARAMS) {
      const x = o(s[p]), d = D.ref[sp][p]
      out[p] = { texto: typeof x.texto === "string" ? x.texto.slice(0, 120) : d.texto, min: num(x.min, d.min), max: num(x.max, d.max) }
    }
    return out
  }
  const cut = (sp: Species) => {
    const x = o(upc[sp]), d = D.upc[sp]
    return { limitrofe: num(x.limitrofe, d.limitrofe) ?? d.limitrofe, proteinurico: num(x.proteinurico, d.proteinurico) ?? d.proteinurico }
  }
  return { ref: { canino: species("canino"), felino: species("felino") }, upc: { canino: cut("canino"), felino: cut("felino") } }
}

export const speciesKey = (species: string): Species => (species === "Felino" ? "felino" : "canino")

// ── Resultado ────────────────────────────────────────────────────────────────────────────────────
export type Reactivo = { id: string; nombre: string; marca: string; lote: string; vence: string } // vence: YYYY-MM-DD
type Lista<T> = { ninguno: boolean; items: T[] }
export type OrinaData = {
  metodo: string
  color: string
  colorOtro: string
  aspecto: string
  densidad: string
  olor: string
  glucosa: string
  bilirrubina: string
  cetonas: string
  sangre: string
  nitritos: string
  leucocitos: string
  ph: string
  proteinas: string
  urobilinogeno: string
  creatinina: string
  reactivo: Reactivo | null
  metodos: string
  heller: string
  anilloHeller: string
  proteinaMgDl: string // opcional: proteína medida por otro método (si no, sale de la tirilla)
  sedimento: {
    cantidad: string
    leucocitos: string
    eritrocitos: string
    transicionales: string
    escamosas: string
    bacterias: { grado: string; tipo: string; ubicacion: string }
    cilindros: Lista<{ tipo: string; cantidad: string }>
    cristales: Lista<{ tipo: string; cantidad: string }>
    otros: string
  }
  observaciones: string
}

export const ORINA_DEFAULT: OrinaData = {
  metodo: "", color: "", colorOtro: "", aspecto: "", densidad: "", olor: "S.G.",
  glucosa: "Negativo", bilirrubina: "Negativo", cetonas: "Negativo", sangre: "Negativo", nitritos: "Negativo", leucocitos: "Negativo",
  ph: "", proteinas: "Negativo", urobilinogeno: "", creatinina: "",
  reactivo: null, metodos: METODOS_DEFAULT,
  heller: "Negativo", anilloHeller: "Negativo", proteinaMgDl: "",
  sedimento: {
    cantidad: "", leucocitos: "0–2", eritrocitos: "0–2", transicionales: "0–2", escamosas: "0–2",
    bacterias: { grado: "Negativo", tipo: "", ubicacion: "" },
    cilindros: { ninguno: true, items: [] },
    cristales: { ninguno: true, items: [] },
    otros: "",
  },
  observaciones: "",
}

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.slice(0, max) : "")
// Las listas son sugerencias: se acepta cualquier texto digitado (vacío / ausente -> valor por defecto)
const free = (v: unknown, fb: string, max = 120) => (typeof v === "string" ? v.slice(0, max) : fb)

export function readOrina(structured: unknown): OrinaData {
  const raw = (structured && typeof structured === "object" ? (structured as Record<string, unknown>).orina : null) as Record<string, unknown> | null
  const D = ORINA_DEFAULT
  if (!raw || typeof raw !== "object") return structuredClone(D)
  const o = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {})
  const list = <T,>(v: unknown, map: (x: Record<string, unknown>) => T): T[] =>
    Array.isArray(v) ? v.slice(0, 20).filter(x => x && typeof x === "object").map(x => map(x as Record<string, unknown>)) : []
  const sed = o(raw.sedimento), bact = o(sed.bacterias), cil = o(sed.cilindros), cri = o(sed.cristales), re = o(raw.reactivo)
  const tira = (k: string) => free(raw[k], "Negativo")
  const campo = (k: string, fb: string) => free(sed[k], fb)
  return {
    metodo: free(raw.metodo, ""),
    color: free(raw.color, ""),
    colorOtro: str(raw.colorOtro, 100),
    aspecto: free(raw.aspecto, ""),
    densidad: str(raw.densidad, 10),
    olor: free(raw.olor, D.olor),
    glucosa: tira("glucosa"), bilirrubina: tira("bilirrubina"), cetonas: tira("cetonas"),
    sangre: tira("sangre"), nitritos: tira("nitritos"), leucocitos: tira("leucocitos"),
    ph: str(raw.ph, 10),
    proteinas: free(raw.proteinas, "Negativo"),
    urobilinogeno: str(raw.urobilinogeno, 10),
    creatinina: str(raw.creatinina, 10),
    reactivo: typeof re.id === "string" && re.id
      ? { id: re.id, nombre: str(re.nombre, 120), marca: str(re.marca, 120), lote: str(re.lote, 60), vence: str(re.vence, 10) }
      : null,
    metodos: typeof raw.metodos === "string" ? str(raw.metodos, 300) : D.metodos,
    heller: free(raw.heller, "Negativo"),
    anilloHeller: free(raw.anilloHeller, "Negativo"),
    proteinaMgDl: str(raw.proteinaMgDl, 10),
    sedimento: {
      cantidad: free(sed.cantidad, ""),
      leucocitos: campo("leucocitos", "0–2"), eritrocitos: campo("eritrocitos", "0–2"),
      transicionales: campo("transicionales", "0–2"), escamosas: campo("escamosas", "0–2"),
      bacterias: {
        grado: free(bact.grado, "Negativo"),
        tipo: free(bact.tipo, ""),
        ubicacion: free(bact.ubicacion, ""),
      },
      cilindros: { ninguno: cil.ninguno !== false, items: list(cil.items, x => ({ tipo: free(x.tipo, ""), cantidad: str(x.cantidad, 30) })) },
      cristales: { ninguno: cri.ninguno !== false, items: list(cri.items, x => ({ tipo: free(x.tipo, ""), cantidad: free(x.cantidad, "", 30) })) },
      otros: str(sed.otros, 1000),
    },
    observaciones: str(raw.observaciones, 4000),
  }
}

// ── Validaciones ────────────────────────────────────────────────────────────────────────────────
const toNum = (v: string) => Number(v.replace(",", "."))
export function densidadError(v: string): string | null {
  if (!v.trim()) return null
  const n = toNum(v)
  if (!Number.isFinite(n) || n < 1 || n > 1.08) return "La densidad debe estar entre 1.000 y 1.080"
  return null
}
export function phOrinaError(v: string): string | null {
  if (!v.trim()) return null
  const n = toNum(v)
  if (!Number.isFinite(n) || n < 5 || n > 9) return "El pH debe estar entre 5.0 y 9.0"
  if (Math.round(n * 2) !== n * 2) return "El pH va en pasos de 0.5"
  return null
}
const numError = (label: string, v: string) => (v.trim() && !(Number.isFinite(toNum(v)) && toNum(v) >= 0) ? `${label} debe ser un número` : null)

// Fecha de hoy en Colombia (YYYY-MM-DD) para comparar con el vencimiento del lote
export const todayCO = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
export const loteVencido = (r: Reactivo | null, onDate = todayCO()) => !!r?.vence && r.vence < onDate

// Errores que impiden validar (guardar) el resultado
export function orinaErrors(d: OrinaData): string[] {
  return [
    !d.metodo && "Selecciona el método de recolección",
    !d.reactivo && "Selecciona la tirilla / reactivo usado (Inventario)",
    loteVencido(d.reactivo) && `El lote ${d.reactivo!.lote} de ${d.reactivo!.nombre} está vencido (${d.reactivo!.vence}): no se puede validar el resultado`,
    densidadError(d.densidad),
    phOrinaError(d.ph),
    numError("El urobilinógeno", d.urobilinogeno),
    numError("La creatinina urinaria", d.creatinina),
    numError("La proteína urinaria", d.proteinaMgDl),
  ].filter((x): x is string => typeof x === "string")
}

// ── Presentación ────────────────────────────────────────────────────────────────────────────────
export const densidadLabel = (v: string) => (v.trim() && Number.isFinite(toNum(v)) ? toNum(v).toFixed(3) : "")
export const phOrinaLabel = (v: string) => (v.trim() && Number.isFinite(toNum(v)) ? toNum(v).toFixed(1) : "")
export const colorOrinaLabel = (d: OrinaData) => (d.color === "Otro" ? d.colorOtro.trim() || "Otro" : d.color)

// ¿Resultado fuera de lo normal? (sale en negrita)
export function isAbnormal(param: CatParam | NumParam, value: string, refs: SpeciesRefs): boolean {
  if (!value.trim()) return false
  if ((CAT_PARAMS as readonly string[]).includes(param)) {
    const r = refs[param as CatParam]
    return value !== "No evaluado" && !r.normales.includes(value)
  }
  const r = refs[param as NumParam], n = toNum(value)
  if (!Number.isFinite(n)) return false
  return (r.min !== null && n < r.min) || (r.max !== null && n > r.max)
}

// UPC = proteína urinaria (mg/dL) / creatinina urinaria (mg/dL). La proteína sale de la tirilla salvo
// que se haya medido por otro método (proteinaMgDl).
export function upcValue(d: OrinaData): number | null {
  const creat = toNum(d.creatinina)
  if (!d.creatinina.trim() || !Number.isFinite(creat) || creat <= 0) return null
  const prot = d.proteinaMgDl.trim() ? toNum(d.proteinaMgDl) : PROTEINA_MG_DL[d.proteinas]
  if (prot === undefined || !Number.isFinite(prot)) return null
  return Math.round((prot / creat) * 100) / 100
}
export function upcInterpretacion(upc: number, cut: { limitrofe: number; proteinurico: number }): string {
  if (upc < cut.limitrofe) return "No proteinúrico"
  if (upc <= cut.proteinurico) return "Limítrofe"
  return "Proteinúrico"
}
