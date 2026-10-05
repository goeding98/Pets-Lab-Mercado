// Raspado de Piel: el campo "Observaciones" pasa de ser una fila más de la Microscopía a su propia
// sección "Observaciones" (caja de texto amplia al final, ver lib/sections.ts), en el examen y en su copia
// dentro de los Perfiles Dermatológico Sencillo / Sencillo 2 ("Raspado de Piel — Observaciones").
// Se mueve el mismo campo (mismo id): los resultados ya guardados y el vínculo con /rangos se conservan.
// Idempotente: si ya está en su propia sección, no hace nada.
//
// Sin --apply es un ensayo: hace todo dentro de la transacción y revierte.
//   node node_modules/tsx/dist/cli.mjs scripts/raspado-observaciones.ts [--apply]
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")

async function main() {
  await prisma.$transaction(async tx => {
    const micro = await tx.examSection.findMany({
      where: {
        OR: [
          { name: "Microscopía", template: { name: "Raspado de Piel" } },
          { name: "Raspado de Piel — Microscopía" },
        ],
      },
      include: { fields: true, template: { include: { sections: true } } },
    })
    if (micro.length === 0) throw new Error("No se encontró la Microscopía del Raspado de Piel")

    for (const s of micro) {
      const field = s.fields.find(f => f.name === "Observaciones")
      if (!field) {
        console.log(`= ${s.template.name}: la Microscopía ya no tiene Observaciones`)
        continue
      }
      const name = s.name.startsWith("Raspado de Piel — ") ? "Raspado de Piel — Observaciones" : "Observaciones"
      // Hacer espacio justo después de la Microscopía
      await tx.examSection.updateMany({
        where: { templateId: s.templateId, order: { gt: s.order } },
        data: { order: { increment: 1 } },
      })
      const section = await tx.examSection.create({ data: { templateId: s.templateId, name, order: s.order + 1 } })
      await tx.examField.update({ where: { id: field.id }, data: { sectionId: section.id, order: 0 } })
      console.log(`+ ${s.template.name}: "${s.name}" -> nueva sección "${name}" (orden ${s.order + 1})`)
    }
    if (!APPLY) throw new Error("ENSAYO")
  }, { timeout: 60000, maxWait: 20000 })
}

main()
  .then(() => console.log("Aplicado."))
  .catch(e => console.log(e.message === "ENSAYO" ? "Ensayo OK (revertido). Correr con --apply para aplicar." : e))
  .finally(() => prisma.$disconnect())
