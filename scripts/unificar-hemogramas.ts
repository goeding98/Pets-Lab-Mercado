// Unifica los hemogramas (pedido del laboratorio, oct 2026):
// - Reticulocitos: unidad "% corregido", referencia canino "0 – 1.5" y felino "0 – 1", en el
//   "Hemograma Completo con Recuento de Reticulocitos" y en su copia dentro de todos los perfiles.
// - "Hemograma Simple / Proteínas Plasmáticas" = el Hemograma Completo SIN reticulocitos: se rearman
//   sus secciones copiando las del Completo (mismos campos, rangos y fórmulas). Si el Completo cambia,
//   volver a correr este script para mantenerlos iguales. Aborta si el Simple ya tiene resultados.
//
// Sin --apply es un ensayo: hace todo dentro de la transacción y revierte.
//   node node_modules/tsx/dist/cli.mjs scripts/unificar-hemogramas.ts [--apply]
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")

const COMPLETO = "Hemograma Completo con Recuento de Reticulocitos"
const SIMPLE = "Hemograma Simple / Proteínas Plasmáticas"
const RETIC = { unit: "% corregido", refCanine: "0 – 1.5", refFeline: "0 – 1" }

async function main() {
  await prisma.$transaction(async tx => {
    // 1. Reticulocitos del Completo y de los perfiles (sección "Hemograma Completo")
    const retic = await tx.examField.updateMany({
      where: {
        key: { startsWith: "reticulocitos" },
        section: { name: "Hemograma Completo", template: { active: true } },
      },
      data: RETIC,
    })
    console.log(`Reticulocitos actualizados: ${retic.count}`)

    // 2. Simple = Completo sin reticulocitos
    const completo = await tx.examTemplate.findFirstOrThrow({
      where: { name: COMPLETO, active: true },
      include: { sections: { orderBy: { order: "asc" }, include: { fields: { orderBy: { order: "asc" } } } } },
    })
    const simple = await tx.examTemplate.findFirstOrThrow({ where: { name: SIMPLE, active: true } })
    const used = await tx.examResult.count({ where: { orderExam: { templateId: simple.id } } })
    if (used > 0) throw new Error(`${SIMPLE} ya tiene ${used} resultados; no se rearma`)

    await tx.examSection.deleteMany({ where: { templateId: simple.id } })
    for (const s of completo.sections) {
      const fields = s.fields.filter(f => !f.key?.startsWith("reticulocitos"))
      if (fields.length === 0) continue
      await tx.examSection.create({
        data: {
          templateId: simple.id,
          name: s.name === "Hemograma Completo" ? "Hemograma" : s.name,
          order: s.order,
          fields: {
            create: fields.map((f, i) => ({
              name: f.name, key: f.key, unit: f.unit, refCanine: f.refCanine, refFeline: f.refFeline,
              technique: f.technique, fieldType: f.fieldType, calcFormula: f.calcFormula, order: i,
            })),
          },
        },
      })
      console.log(`  ${SIMPLE} :: ${s.name === "Hemograma Completo" ? "Hemograma" : s.name} -> ${fields.length} campos`)
    }
    if (!APPLY) throw new Error("ENSAYO")
  }, { timeout: 60000 })
}

main()
  .then(() => console.log("Aplicado."))
  .catch(e => console.log(e.message === "ENSAYO" ? "Ensayo OK (revertido). Usa --apply para guardar." : e))
  .finally(() => prisma.$disconnect())
