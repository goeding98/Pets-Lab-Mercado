// Reemplaza el catálogo de exámenes (58 plantillas viejas) por el catálogo v6
// (66 exámenes, exportado del Excel maestro a catalogo-pets-lab/).
//
// Corrige un problema de exportación puntual: en los 5 hemogramas completos
// (canino, felino, y las 3 variantes caninas por edad) las filas de
// neutrófilos/bandas/linfocitos/monocitos/eosinófilos/basófilos venían con la
// fórmula de Excel metida en "unidad" y el rango de referencia con dos rangos
// pegados (% relativo y valor absoluto). Aquí se separan en dos parámetros:
// uno de entrada (%) y uno calculado (valor absoluto = % × leucocitos totales / 100).
import fs from "fs"
import path from "path"
import { PrismaClient } from "@prisma/client"
import type { Catalogo, Examen, Parametro, Seccion, CampoTexto, Especie } from "../catalogo-pets-lab/catalogo.types"

const prisma = new PrismaClient()

const catalogoPath = path.join(process.cwd(), "catalogo-pets-lab", "catalogo-examenes.json")
const catalogo = JSON.parse(fs.readFileSync(catalogoPath, "utf-8")) as Catalogo

// ── Nombres: Title Case preservando acrónimos conocidos ────────────────────
const ACRONYMS: Record<string, string> = {
  rbc: "RBC", wbc: "WBC", plt: "PLT", mcv: "MCV", mch: "MCH", mchc: "MCHC",
  vpm: "VPM", pt: "PT", ptt: "PTT", koh: "KOH", cpl2: "CPL2", fpl2: "FPL2",
  paaf: "PAAF", lcr: "LCR", upc: "UPC", fiv: "FIV", felv: "FeLV", cdv: "CDV",
  cpv: "CPV", snap: "SNAP", "4dx": "4DX", ggt: "GGT", t4: "T4", tsh: "TSH",
  na: "Na", k: "K", cl: "Cl", ph: "pH", be: "BE", ica: "iCa", tco2: "TCO2",
  hco3: "HCO3", po2: "pO2", pco2: "pCO2", sato2: "SatO2", cgmh: "CGMH",
  vgm: "V.G.M.", "v.g.m.": "V.G.M.", ag: "Ag", ab: "Ab", igg: "IgG", cpk: "CPK", alt: "ALT",
  ast: "AST", fa: "FA", elisa: "ELISA", pcr: "PCR", ig: "Ig",
  i: "I", ii: "II", iii: "III", iv: "IV",
}
// Palabras del origen sin tilde que se restauran por ser inequívocas (no son juicio clínico, solo ortografía).
const ACCENT_FIX: Record<string, string> = {
  relacion: "Relación", solidos: "Sólidos", fibrinogeno: "Fibrinógeno",
  anionica: "Aniónica", anion: "Anión",
}
const LOWERCASE_WORDS = new Set(["de", "del", "la", "el", "en", "con", "a", "para", "o", "u", "e", "y", "sin", "the"])

function titleCaseWord(word: string, isFirst: boolean): string {
  const m = word.match(/^([^\p{L}\p{N}]*)([\p{L}\p{N}.]*)([^\p{L}\p{N}]*)$/u)
  if (!m) return word
  const [, lead, core, trail] = m
  if (!core) return word
  const lower = core.toLowerCase()
  const lowerNoDots = lower.replace(/\./g, "")
  if (ACCENT_FIX[lower]) return lead + ACCENT_FIX[lower] + trail
  if (ACRONYMS[lower]) return lead + ACRONYMS[lower] + trail
  if (ACRONYMS[lowerNoDots]) return lead + ACRONYMS[lowerNoDots] + trail
  if (!isFirst && LOWERCASE_WORDS.has(lower)) return lead + lower + trail
  const cased = core[0].toUpperCase() + core.slice(1).toLowerCase()
  return lead + cased + trail
}

function titleCase(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w, i) => titleCaseWord(w, i === 0))
    .join(" ")
}

function cleanParamName(nombre: string): string {
  return titleCase(nombre.replace(/\s*\(calculado\)\s*$/i, "").trim())
}

function cleanEtiqueta(etiqueta: string): string {
  return titleCase(etiqueta.replace(/:\s*$/, "").trim())
}

// ── Área / muestra / entrega por categoría ──────────────────────────────────
const AREA_BY_CATEGORIA: Record<string, string> = {
  "HEMATOLOGÍA": "Hematología",
  "QUÍMICA SANGUÍNEA": "Química Sanguínea",
  "PERFILES QUÍMICA SANGUÍNEA": "Perfiles Química Sanguínea",
  "CITOLOGÍAS": "Citologías",
  "CITOLOGÍAS DE PIEL": "Citologías de Piel",
  "COPROLOGÍA": "Coprología",
  "UROANÁLISIS": "Uroanálisis",
  "ENDOCRINOLOGÍA": "Endocrinología",
  "INMUNOLOGÍA": "Inmunología",
  "GASES": "Gases",
}

const SAMPLE_BY_CATEGORIA: Record<string, { turnaround: string; sampleType: string }> = {
  "HEMATOLOGÍA": { turnaround: "Mismo día", sampleType: "1 mL EDTA" },
  "QUÍMICA SANGUÍNEA": { turnaround: "24h", sampleType: "1 mL suero (tubo seco)" },
  "PERFILES QUÍMICA SANGUÍNEA": { turnaround: "24h", sampleType: "2 mL suero (tubo seco)" },
  "CITOLOGÍAS": { turnaround: "48h", sampleType: "Placa fijada / hisopo según sitio" },
  "CITOLOGÍAS DE PIEL": { turnaround: "48h", sampleType: "Raspado / hisopado de piel" },
  "COPROLOGÍA": { turnaround: "Mismo día", sampleType: "5 g heces frescas" },
  "UROANÁLISIS": { turnaround: "Mismo día", sampleType: "5 mL orina fresca" },
  "ENDOCRINOLOGÍA": { turnaround: "24h", sampleType: "1 mL suero (tubo seco)" },
  "INMUNOLOGÍA": { turnaround: "24h", sampleType: "0.5 mL suero" },
  "GASES": { turnaround: "Mismo día", sampleType: "1 mL sangre (jeringa heparinizada)" },
}

// ── Rango de referencia → string "min – max" ────────────────────────────────
function fixDecimalComma(s: string): string {
  return s.replace(/(\d),(\d)/g, "$1.$2")
}

function formatRange(min: number | string | null | undefined, max: number | string | null | undefined): string | null {
  if (min == null && max == null) return null
  if (max == null) return fixDecimalComma(String(min))
  if (min == null) return fixDecimalComma(String(max))
  return fixDecimalComma(`${min} – ${max}`)
}

function extractRefs(p: Parametro, especie: string): { refCanine: string | null; refFeline: string | null } {
  const ref = p.referencia as Record<string, any> | null | undefined
  if (!ref) return { refCanine: null, refFeline: null }
  const keys = Object.keys(ref)

  if (keys.includes("canino") || keys.includes("felino")) {
    const c = ref.canino
    const f = ref.felino
    return {
      refCanine: c ? formatRange(c.min, c.max) : null,
      refFeline: f ? formatRange(f.min, f.max) : null,
    }
  }

  // Gases sanguíneos: referencia por tipo de muestra (arterial/venosa), no por especie.
  // Aplica igual a ambas especies — se combinan en un solo string.
  if (keys.includes("ref_arterial") || keys.includes("ref_venosa")) {
    const a = ref.ref_arterial ? formatRange(ref.ref_arterial.min, ref.ref_arterial.max) : null
    const v = ref.ref_venosa ? formatRange(ref.ref_venosa.min, ref.ref_venosa.max) : null
    const parts = [a && `Art: ${a}`, v && `Ven: ${v}`].filter(Boolean)
    const combined = parts.length ? parts.join(" · ") : null
    return { refCanine: combined, refFeline: combined }
  }

  // Cualquier otra clave genérica (valores_de_referencia, referencia, ref, resultado, ...):
  // un solo rango que aplica a las especies que cubre el examen.
  const generic = keys.length === 1 ? ref[keys[0]] : null
  const value = generic ? formatRange(generic.min, generic.max) : null
  const isCanino = especie.includes("Canino")
  const isFelino = especie.includes("Felino")
  return {
    refCanine: isCanino ? value : null,
    refFeline: isFelino ? value : null,
  }
}

// ── Fix puntual: diferencial leucocitario de los 5 hemogramas completos ────
const CELULAS = ["neutrofilos", "bandas", "linfocitos", "monocitos", "eosinofilos", "basofilos"] as const
const WBC_ID = "recuento_total_de_leucocitos_wbc"
const SUMA_ID = "suma_del_diferencial_debe_dar_100"

function esDiferencialRoto(parametros: Parametro[]): boolean {
  return parametros.some((p) => p.id === SUMA_ID) && parametros.some((p) => CELULAS.includes(p.id as any))
}

function corregirDiferencial(parametros: Parametro[], especie: string): Parametro[] {
  const out: Parametro[] = []
  for (const p of parametros) {
    if (!CELULAS.includes(p.id as any) && p.id !== SUMA_ID) {
      out.push(p)
      continue
    }
    if (p.id === SUMA_ID) {
      out.push({
        id: SUMA_ID,
        nombre: "Suma del Diferencial (debe dar 100%)",
        unidad: "%",
        tipo: "calculado",
        formula: CELULAS.join(" + "),
        referencia: null,
      })
      continue
    }
    // p.id es una de las CELULAS: separar en % relativo (entrada) + absoluto (calculado)
    const ref = p.referencia as Record<string, any> | null | undefined
    const key = Object.keys(ref || {})[0]
    const raw = key ? ref![key] : null
    const relRange = raw ? String(raw.min) : null // el % siempre viene en el lado "min"
    const absRange = raw && typeof raw.max === "string" ? String(raw.max) : null // rango limpio "x - y"; si es un número suelto (caso potros), se omite

    out.push({
      id: p.id,
      nombre: cleanParamName(p.nombre) + " (%)",
      unidad: "%",
      tipo: "entrada",
      referencia: relRange ? ({ [especie.includes("Felino") && !especie.includes("Canino") ? "felino" : "canino"]: { min: relRange, max: null } } as any) : null,
    } as Parametro)

    out.push({
      id: `${p.id}_absoluto`,
      nombre: cleanParamName(p.nombre) + " (Absoluto)",
      unidad: "10³/µL",
      tipo: "calculado",
      formula: `${p.id}*${WBC_ID}/100`,
      referencia: absRange ? ({ [especie.includes("Felino") && !especie.includes("Canino") ? "felino" : "canino"]: { min: absRange, max: null } } as any) : null,
    } as Parametro)
  }
  return out
}

// ── Tipo de campo: el catálogo solo distingue entrada/calculado, no si el valor
// es numérico o cualitativo (texto). Unidades reales conocidas → number; cualquier
// otra cosa (fórmulas filtradas, "Sí / No", descripciones, técnicas de laboratorio
// coladas en el campo de unidad, etc.) → text, para no bloquear la captura con un
// input numérico donde el laboratorista necesita escribir una palabra. ────────
const REAL_UNITS = new Set([
  "%", "10³/L", "10³/µL", "10⁶/µL", "fL", "g/dl", "g/dL", "g/L", "meq/L", "mg/dL",
  "mmHg", "mmol/L", "mOsm/kg", "ng/dL", "ng/mL", "nmol/L", "pg/mL", "RBC/µL", "Seg",
  "ug/dL", "UI/L", "WBC/µL", "X10³ /mm³", "X10⁶ /mm³", "X10⁹ / Lts", "µmol/L",
])

function isNumericRangeString(s: unknown): boolean {
  return typeof s === "number" || (typeof s === "string" && /^-?[\d.,]+(\s*[-–]\s*-?[\d.,]+)?$/.test(s.trim()))
}

function inferEntradaFieldType(p: Parametro): { fieldType: "number" | "text"; unit: string | null } {
  const unit = p.unidad?.trim() || null
  if (unit && REAL_UNITS.has(unit)) return { fieldType: "number", unit }
  if (unit && unit.startsWith("=")) return { fieldType: "text", unit: null } // fórmula de Excel filtrada

  // Sin unidad reconocida: se decide por el rango de referencia (¿es numérico?).
  const ref = p.referencia as Record<string, any> | null | undefined
  const firstRange = ref ? Object.values(ref).find((v) => v != null) : null
  const looksNumeric = firstRange && isNumericRangeString((firstRange as any).min ?? (firstRange as any).max)

  return looksNumeric ? { fieldType: "number", unit } : { fieldType: "text", unit: null }
}

// ── Import ───────────────────────────────────────────────────────────────
type FieldRow = {
  name: string
  key: string
  unit: string | null
  refCanine: string | null
  refFeline: string | null
  fieldType: "number" | "text" | "calculated"
  calcFormula: string | null
}

function buildFields(seccion: Seccion, especie: string): FieldRow[] {
  const fields: FieldRow[] = []
  let parametros = seccion.parametros ?? []
  if (esDiferencialRoto(parametros)) parametros = corregirDiferencial(parametros, especie)

  for (const p of parametros) {
    const { refCanine, refFeline } = extractRefs(p, especie)
    const isCalc = p.tipo === "calculado"
    const { fieldType, unit } = isCalc
      ? { fieldType: "calculated" as const, unit: p.unidad ?? null }
      : inferEntradaFieldType(p)
    fields.push({
      name: cleanParamName(p.nombre),
      key: p.id,
      unit,
      refCanine,
      refFeline,
      fieldType,
      calcFormula: isCalc ? p.formula ?? null : null,
    })
  }

  for (const c of seccion.campos ?? []) {
    fields.push({
      name: cleanEtiqueta(c.etiqueta),
      key: c.id,
      unit: null,
      refCanine: null,
      refFeline: null,
      fieldType: "text",
      calcFormula: null,
    })
  }

  return fields
}

const DRY_RUN = process.argv.includes("--dry-run")
const SHOW_EXAM = process.argv.find((a) => a.startsWith("--exam="))?.split("=")[1]

function planExamen(examen: Examen) {
  const area = AREA_BY_CATEGORIA[examen.categoria] ?? titleCase(examen.categoria)
  const { turnaround, sampleType } = SAMPLE_BY_CATEGORIA[examen.categoria] ?? { turnaround: "24h", sampleType: "Según indicación" }
  const name = titleCase(examen.nombre)

  const sections = examen.secciones
    .map((seccion) => ({ name: titleCase(seccion.titulo), fields: buildFields(seccion, examen.especie) }))
    .filter((s) => s.fields.length > 0)

  // Un campo del que depende alguna fórmula del mismo examen es, por definición,
  // numérico — aunque el catálogo no le haya dado unidad ni rango de referencia.
  const allFields = sections.flatMap((s) => s.fields)
  const dependencyKeys = new Set<string>()
  for (const f of allFields) {
    if (f.fieldType !== "calculated" || !f.calcFormula) continue
    for (const m of f.calcFormula.matchAll(/[a-z_][a-z0-9_]*/g)) dependencyKeys.add(m[0])
  }
  for (const f of allFields) {
    if (f.fieldType === "text" && dependencyKeys.has(f.key)) f.fieldType = "number"
  }

  return { name, area, turnaround, sampleType, sections }
}

async function importExamen(examen: Examen) {
  const plan = planExamen(examen)

  // Un solo create anidado (plantilla + secciones + campos) por examen, en vez de
  // ~1 + N + M round trips — el pooler en modo transacción corta la conexión si
  // se abren demasiadas queries pequeñas seguidas (ver gotcha de db:push en CLAUDE.md).
  await prisma.examTemplate.create({
    data: {
      name: plan.name,
      area: plan.area,
      turnaround: plan.turnaround,
      sampleType: plan.sampleType,
      sections: {
        create: plan.sections.map((seccion, si) => ({
          name: seccion.name,
          order: si,
          fields: {
            create: seccion.fields.map((f, fi) => ({
              name: f.name,
              key: f.key,
              unit: f.unit,
              refCanine: f.refCanine,
              refFeline: f.refFeline,
              fieldType: f.fieldType,
              calcFormula: f.calcFormula,
              order: fi,
            })),
          },
        })),
      },
    },
  })

  console.log(`  ✓ #${examen.numero} ${plan.name} (${plan.area})`)
}

async function main() {
  if (DRY_RUN) {
    const CHECK_TYPES = process.argv.includes("--check-types")
    console.log(`Dry run — ${catalogo.examenes.length} exámenes\n`)
    let totalFields = 0
    let totalCalc = 0
    let totalText = 0
    let totalNumber = 0
    let badDeps = 0
    for (const examen of catalogo.examenes) {
      const plan = planExamen(examen)
      const allFields = plan.sections.flatMap((s) => s.fields)
      const fieldCount = allFields.length
      const calcCount = allFields.filter((f) => f.fieldType === "calculated").length
      totalFields += fieldCount
      totalCalc += calcCount
      totalText += allFields.filter((f) => f.fieldType === "text").length
      totalNumber += allFields.filter((f) => f.fieldType === "number").length

      if (CHECK_TYPES) {
        const byKey = Object.fromEntries(allFields.map((f) => [f.key, f]))
        for (const f of allFields) {
          if (f.fieldType !== "calculated" || !f.calcFormula) continue
          const ids = [...f.calcFormula.matchAll(/[a-z_][a-z0-9_]*/g)].map((m) => m[0])
          for (const id of new Set(ids)) {
            const dep = byKey[id]
            if (!dep) {
              console.log(`  ! #${examen.numero} ${plan.name}: fórmula de "${f.name}" (${f.key}) referencia "${id}", que no existe como campo`)
              badDeps++
            } else if (dep.fieldType === "text") {
              console.log(`  ! #${examen.numero} ${plan.name}: fórmula de "${f.name}" (${f.key}) depende de "${dep.name}" (${id}), que quedó como texto`)
              badDeps++
            }
          }
        }
        for (const f of allFields) {
          if (f.fieldType === "text" && f.calcFormula === null && (f as any).unit === null) {
            // listado informativo, no error
          }
        }
        continue
      }

      if (SHOW_EXAM && String(examen.numero) !== SHOW_EXAM) continue
      console.log(`#${examen.numero} ${plan.name} | ${plan.area} | ${plan.turnaround} | ${plan.sampleType} | ${plan.sections.length} secciones, ${fieldCount} campos (${calcCount} calculados)`)
      for (const s of plan.sections) {
        for (const f of s.fields) {
          if (f.fieldType === "calculated") {
            console.log(`      [calc] ${f.name} (${f.key}) = ${f.calcFormula}  ref.can=${f.refCanine ?? "-"} ref.fel=${f.refFeline ?? "-"}`)
          } else if (SHOW_EXAM) {
            console.log(`      [${f.fieldType}] ${f.name} (${f.key}) unit=${f.unit ?? "-"} ref.can=${f.refCanine ?? "-"} ref.fel=${f.refFeline ?? "-"}`)
          }
        }
      }
    }
    if (CHECK_TYPES) {
      console.log(`\nDependencias de fórmulas rotas: ${badDeps}`)
    }
    console.log(`\nTotal: ${catalogo.examenes.length} exámenes, ${totalFields} campos, ${totalCalc} calculados, ${totalNumber} numéricos, ${totalText} texto`)
    return
  }

  const RESUME = process.argv.includes("--resume")
  let examenes = catalogo.examenes

  if (RESUME) {
    const existentes = new Set((await prisma.examTemplate.findMany({ select: { name: true } })).map((t) => t.name))
    examenes = examenes.filter((e) => !existentes.has(titleCase(e.nombre)))
    console.log(`Resume: ${existentes.size} plantillas ya cargadas, faltan ${examenes.length}\n`)
  } else {
    console.log("Borrando datos de prueba (órdenes) y catálogo viejo (58 plantillas)...")
    const orders = await prisma.order.deleteMany({})
    const templates = await prisma.examTemplate.deleteMany({})
    console.log(`  - ${orders.count} órdenes borradas, ${templates.count} plantillas viejas borradas\n`)
  }

  console.log(`Importando catálogo v6 (${examenes.length} exámenes)...`)
  for (const examen of examenes) {
    await importExamen(examen)
  }
  console.log("\n¡Importación completada!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
