// Ajustes pedidos por el laboratorio a Raspado de Piel y Tricograma (y a sus copias dentro de los
// Perfiles Dermatológicos Sencillo / Sencillo 2):
// - Raspado de Piel — Microscopía: agrega "Observaciones" al final.
// - Tricograma — Relación Anágeno / Telógeno: quita "Total de Pelos Evaluados".
// - Tricograma — Otros Elementos: quita todos sus campos y deja solo "Observaciones".
// Nunca borra un campo con resultados (aborta). Idempotente.
//
// Sin --apply es un ensayo: hace todo dentro de la transacción y revierte.
//   node node_modules/tsx/dist/cli.mjs scripts/ajustes-raspado-tricograma.ts [--apply]
import { PrismaClient, Prisma } from "@prisma/client"

const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")

// Secciones por nombre: en los perfiles llevan el prefijo "<Examen> — "
const isSection = (name: string, exam: string, section: string) =>
  name === section || name === `${exam} — ${section}`

async function addObservaciones(tx: Prisma.TransactionClient, sectionId: string) {
  const section = await tx.examSection.findUniqueOrThrow({
    where: { id: sectionId },
    include: { fields: true, template: { include: { sections: { include: { fields: { select: { key: true } } } } } } },
  })
  if (section.fields.some(f => f.name === "Observaciones")) return
  // Las fórmulas se resuelven por key en todo el examen: evitar choques (igual que composeTemplate)
  const keys = new Set(section.template.sections.flatMap(s => s.fields.map(f => f.key)))
  let key = "observaciones"
  for (let n = 2; keys.has(key); n++) key = `observaciones__${n}`
  const order = Math.max(-1, ...section.fields.map(f => f.order)) + 1
  await tx.examField.create({ data: { sectionId, name: "Observaciones", key, fieldType: "text", order } })
  console.log(`  + ${section.template.name} :: ${section.name} -> Observaciones (${key})`)
}

async function deleteFields(tx: Prisma.TransactionClient, fieldIds: string[], label: string) {
  if (fieldIds.length === 0) return
  const used = await tx.examResult.count({ where: { fieldId: { in: fieldIds } } })
  if (used > 0) throw new Error(`${label}: hay ${used} resultados en campos a borrar; no se toca`)
  await tx.examField.deleteMany({ where: { id: { in: fieldIds } } })
  console.log(`  - ${label}: ${fieldIds.length} campo(s) borrado(s)`)
}

async function main() {
  await prisma.$transaction(async tx => {
    const templates = await tx.examTemplate.findMany({
      where: { active: true, OR: [{ name: { in: ["Raspado de Piel", "Tricograma"] } }, { name: { startsWith: "Perfil Dermatológico" } }] },
      include: { sections: { include: { fields: true } } },
    })

    for (const t of templates) {
      for (const s of t.sections) {
        const label = `${t.name} :: ${s.name}`
        if (isSection(s.name, "Raspado de Piel", "Microscopía")) {
          await addObservaciones(tx, s.id)
        }
        if (isSection(s.name, "Tricograma", "Relación Anágeno / Telógeno")) {
          await deleteFields(tx, s.fields.filter(f => f.key === "total_de_pelos_evaluados").map(f => f.id), label)
        }
        if (isSection(s.name, "Tricograma", "Otros Elementos")) {
          await deleteFields(tx, s.fields.filter(f => f.name !== "Observaciones").map(f => f.id), label)
          await addObservaciones(tx, s.id)
        }
      }
    }
    if (!APPLY) throw new Error("ENSAYO")
  }, { timeout: 60000 })
}

main()
  .then(() => console.log("Aplicado."))
  .catch(e => console.log(e.message === "ENSAYO" ? "Ensayo OK (revertido). Usa --apply para guardar." : e))
  .finally(() => prisma.$disconnect())
