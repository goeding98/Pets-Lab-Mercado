// Liga cada parámetro copiado con su parámetro del examen maestro (ExamField.sourceFieldId), para que
// en /rangos se edite el rango una sola vez y se propague a todas las copias. Además crea los
// hemogramas por edad (0 - 2, 2.5 - 3 y 4 - 6 meses), que son maestros
// propios: copian el Hemograma Completo pero sus rangos se editan aparte (no se ligan a nada).
//
// - Exámenes derivados de otros maestros (DERIVED): sus campos se ligan al maestro fuente.
// - Perfiles: cada sección se llama "<componente>" o "<componente> — <sección>"; el componente se
//   resuelve con COMPONENTS ("Química Sanguínea" busca entre los maestros de esa área).
// - Promociones: se ligan contra sus PromotionComponent.
// El campo se empareja por key base (sin el sufijo __N de composeTemplate) + nombre. Al ligar, la
// copia toma los rangos del maestro. Idempotente.
//
// Sin --apply es un ensayo: hace todo dentro de la transacción y revierte.
//   node node_modules/tsx/dist/cli.mjs scripts/vincular-rangos.ts [--apply]
import { PrismaClient, Prisma } from "@prisma/client"

const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")
type Tx = Prisma.TransactionClient

const COMPLETO = "Hemograma Completo con Recuento de Reticulocitos"
const POR_EDAD = ["Hemograma 0 - 2 Meses", "Hemograma 2.5 - 3 Meses", "Hemograma 4 - 6 Meses"]

// examen derivado -> maestros de los que toma sus parámetros
const DERIVED: [string, string[]][] = [
  ["Hemograma Simple / Proteínas Plasmáticas", [COMPLETO]],
  ["Bilirrubinas Diferenciadas (BT + BD + BI)", ["Bilirrubina Total", "Bilirrubina Directa"]],
  ["Electrolitos (Na, K, Cl, Brecha Aniónica)", ["Cloro"]],
  ["Tiempo de Tromboplastina - Tiempo de Protrombina (TPT + TP)", ["Tiempo de Protrombina (TP)", "Tiempo de Tromboplastina (TPT)"]],
  ["PCR Cualitativa Parvovirus + Distemper Canino", ["PCR Cualitativa Parvovirus Canino", "PCR Cualitativa Distemper Canino"]],
  ["PCR Cualitativa Perfil Viral Felino (Leucemia Viral, Inmunodeficiencia Viral, Mycoplasma, Bartonella)",
    ["PCR Cualitativa Leucemia Viral Felina", "PCR Cualitativa Inmunodeficiencia Viral Felina"]],
  ["Perfil Infeccioso Felino Cualitativo (PCR)", ["PCR Cualitativa Leucemia Viral Felina", "PCR Cualitativa Inmunodeficiencia Viral Felina",
    "PCR Cualitativa Perfil Viral Felino (Leucemia Viral, Inmunodeficiencia Viral, Mycoplasma, Bartonella)"]],
  ["PCR Cualitativa Perfil Hemoparásitos Felino (Anaplasma, Cytauxzoon, Mycoplasma, Bartonella sp.)",
    ["PCR Cualitativa Perfil Viral Felino (Leucemia Viral, Inmunodeficiencia Viral, Mycoplasma, Bartonella)",
      "PCR Cualitativa Hemoparásitos Canino (Ehrlichia, Anaplasma, Hepatozoon, Babesia sp.)"]],
]

// nombre del componente en las secciones de los perfiles -> examen maestro
const COMPONENTS: Record<string, string> = {
  "Hemograma Completo": COMPLETO,
  "Hemoparásitos": "Hemoparásitos (Frotis Extendido y Gota Gruesa)",
  "Coprológico": "Coprológico (Microscopía y Miniflotac)",
  "Parcial de Orina": "Parcial de Orina – Completo (Tirilla Urovet, Test de Héller, Relación P/C, Sedimento, Coloración Wright)",
  "Test VIF / VILEF": "Inmunodeficiencia Viral Felina (VIF) Ab – Leucemia Viral Felina (VILEF) Ag",
  "Test Distemper": "Distemper Canino (Moquillo)",
  "Test Parvovirus": "Parvovirus Canino",
  "UPC": "UPC (Proteinuria / Creatinuria)",
  "Raspado de Piel": "Raspado de Piel",
  "Tricograma": "Tricograma",
  "Cultivo para Hongos": "Cultivo para Hongos",
  "Citología de Piel": "Citología de Piel",
  "Pruebas de Coagulación": "Tiempo de Tromboplastina - Tiempo de Protrombina (TPT + TP)",
}

const baseKey = (k: string | null) => (k ?? "").replace(/__\d+$/, "")

type F = { id: string; name: string; key: string | null; refCanine: string | null; refFeline: string | null; sourceFieldId: string | null }
type T = { id: string; name: string; area: string; fields: F[] }

async function loadTemplate(tx: Tx, where: Prisma.ExamTemplateWhereInput): Promise<T | null> {
  const t = await tx.examTemplate.findFirst({
    where: { active: true, ...where },
    select: { id: true, name: true, area: true, sections: { select: { fields: true } } },
  })
  return t && { id: t.id, name: t.name, area: t.area, fields: t.sections.flatMap(s => s.fields) }
}

// Busca el parámetro maestro entre los candidatos (si el candidato es a su vez copia, sube a su maestro)
function findSource(f: F, candidates: T[], byId: Map<string, F>): F | null {
  const matches = candidates
    .flatMap(t => t.fields.map(x => ({ t, x })))
    .filter(({ x }) => baseKey(x.key) === baseKey(f.key) && x.name === f.name)
    .sort((a, b) => a.t.fields.length - b.t.fields.length) // el examen más específico primero
  if (matches.length === 0) return null
  let src = matches[0].x
  while (src.sourceFieldId) src = byId.get(src.sourceFieldId) ?? src
  return src.id === f.id ? null : src
}

async function main() {
  await prisma.$transaction(async tx => {
    // 1. Hemogramas por edad: copia del Completo, maestros independientes
    const completoFull = await tx.examTemplate.findFirstOrThrow({
      where: { name: COMPLETO, active: true },
      include: { sections: { orderBy: { order: "asc" }, include: { fields: { orderBy: { order: "asc" } } } } },
    })
    for (const name of POR_EDAD) {
      if (await tx.examTemplate.findFirst({ where: { name, active: true } })) { console.log(`= ${name} ya existe`); continue }
      await tx.examTemplate.create({
        data: {
          name, area: completoFull.area, sampleType: completoFull.sampleType, turnaround: completoFull.turnaround,
          description: completoFull.description,
          sections: {
            create: completoFull.sections.map(s => ({
              name: s.name, order: s.order,
              fields: {
                create: s.fields.map(f => ({
                  name: f.name, key: f.key, unit: f.unit, refCanine: f.refCanine, refFeline: f.refFeline,
                  technique: f.technique, fieldType: f.fieldType, calcFormula: f.calcFormula, order: f.order,
                })),
              },
            })),
          },
        },
      })
      console.log(`+ ${name} creado (copia del Hemograma Completo, rangos independientes)`)
    }

    const allFields = await tx.examField.findMany()
    const byId = new Map(allFields.map(f => [f.id, f as F]))
    let linked = 0, changedRanges = 0
    const unlinked: string[] = []
    const pending = new Map<string, string[]>() // id del maestro -> copias a ligar (se escriben en lote al final)

    function link(f: F, src: F, where: string) {
      if (f.sourceFieldId === src.id && f.refCanine === src.refCanine && f.refFeline === src.refFeline) return
      if (f.refCanine !== src.refCanine || f.refFeline !== src.refFeline) {
        changedRanges++
        console.log(`  ~ ${where} :: ${f.name}: {${f.refCanine} | ${f.refFeline}} -> {${src.refCanine} | ${src.refFeline}}`)
      }
      pending.set(src.id, [...(pending.get(src.id) ?? []), f.id])
      f.sourceFieldId = src.id; f.refCanine = src.refCanine; f.refFeline = src.refFeline
      linked++
    }

    // 2. Maestros derivados de otros maestros
    for (const [derivedName, sources] of DERIVED) {
      const d = await loadTemplate(tx, { name: derivedName })
      if (!d) throw new Error(`No existe el examen ${derivedName}`)
      const cands = (await Promise.all(sources.map(n => loadTemplate(tx, { name: n })))).map((t, i) => {
        if (!t) throw new Error(`No existe el examen ${sources[i]}`)
        return { ...t, fields: t.fields.map(x => byId.get(x.id)!) }
      })
      for (const f0 of d.fields) {
        const f = byId.get(f0.id)!
        const src = findSource(f, cands, byId)
        if (src) link(f, src, derivedName)
      }
    }

    // 3. Perfiles (por nombre de sección) y promociones (por sus componentes)
    const masters = await tx.examTemplate.findMany({
      where: { active: true, isPromotion: false, NOT: { area: "Perfiles" }, name: { notIn: POR_EDAD } },
      select: { id: true, name: true, area: true, sections: { select: { fields: { select: { id: true } } } } },
    })
    const masterT = (t: (typeof masters)[number]): T =>
      ({ id: t.id, name: t.name, area: t.area, fields: t.sections.flatMap(s => s.fields.map(x => byId.get(x.id)!)) })
    const quimica = masters.filter(t => t.area === "Química Sanguínea").map(masterT)

    const compuestos = await tx.examTemplate.findMany({
      where: { active: true, OR: [{ area: "Perfiles" }, { isPromotion: true }] },
      select: { name: true, isPromotion: true, promoComponents: { select: { templateId: true } }, sections: { select: { name: true, fields: { select: { id: true } } } } },
    })
    for (const c of compuestos) {
      for (const s of c.sections) {
        let cands: T[]
        if (c.isPromotion) {
          cands = masters.filter(m => c.promoComponents.some(pc => pc.templateId === m.id)).map(masterT)
        } else {
          const comp = s.name.split(" — ")[0]
          if (comp === "Química Sanguínea") cands = quimica
          else if (COMPONENTS[comp]) cands = masters.filter(m => m.name === COMPONENTS[comp]).map(masterT)
          else cands = []
        }
        for (const x of s.fields) {
          const f = byId.get(x.id)!
          const src = findSource(f, cands, byId)
          if (src) link(f, src, c.name)
          else if (f.refCanine || f.refFeline) unlinked.push(`${c.name} :: ${s.name} :: ${f.name}`)
        }
      }
    }

    // Parámetros de perfiles sin maestro activo (ej. Globulinas, cuyo examen está retirado): el primero
    // hace de maestro de los demás con la misma key base + nombre. En /rangos salen como propios de perfiles.
    const orphanGroups = new Map<string, F[]>()
    for (const c of compuestos) for (const s of c.sections) for (const x of s.fields) {
      const f = byId.get(x.id)!
      if (f.sourceFieldId || !(f.refCanine || f.refFeline)) continue
      const g = `${baseKey(f.key)}|${f.name}`
      orphanGroups.set(g, [...(orphanGroups.get(g) ?? []), f])
    }
    for (const [, [master, ...rest]] of orphanGroups) for (const f of rest) link(f, master, "(perfil sin maestro)")

    for (const [srcId, ids] of pending) {
      const src = byId.get(srcId)!
      await tx.examField.updateMany({ where: { id: { in: ids } }, data: { sourceFieldId: srcId, refCanine: src.refCanine, refFeline: src.refFeline } })
    }

    console.log(`\nLigados: ${linked} (rangos corregidos al del maestro: ${changedRanges})`)
    if (unlinked.length) console.log(`Con rango pero sin maestro (quedan editables solo en su examen):\n  ${unlinked.join("\n  ")}`)
    if (!APPLY) throw new Error("ENSAYO")
  }, { timeout: 300_000, maxWait: 30_000 })
}

main()
  .then(() => console.log("Aplicado."))
  .catch(e => console.log(e.message === "ENSAYO" ? "Ensayo OK (revertido). Usa --apply para guardar." : e))
  .finally(() => prisma.$disconnect())
