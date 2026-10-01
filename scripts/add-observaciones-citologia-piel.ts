// Agrega el campo de texto "Observaciones" al final de la Citología de Piel (sección Interpretación),
// también en su copia dentro del Perfil Dermatológico Completo. Idempotente: si ya existe, no hace nada.
// Las órdenes existentes no se tocan; el campo nuevo simplemente sale vacío ("—") en ellas.
//
// Sin --apply es un ensayo: hace todo dentro de la transacción y revierte.
//   node node_modules/tsx/dist/cli.mjs scripts/add-observaciones-citologia-piel.ts [--apply]
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")

const TARGETS = [
  { template: "Citología de Piel", section: "Interpretación" },
  { template: "Perfil Dermatológico Completo", section: "Citología de Piel — Interpretación" },
]

async function main() {
  await prisma.$transaction(async tx => {
    for (const t of TARGETS) {
      const section = await tx.examSection.findFirst({
        where: { name: t.section, template: { name: t.template, active: true } },
        include: { fields: true, template: { include: { sections: { include: { fields: { select: { key: true } } } } } } },
      })
      if (!section) throw new Error(`No se encontró "${t.template}" :: "${t.section}"`)
      if (section.fields.some(f => f.name === "Observaciones")) {
        console.log(`= ${t.template}: ya tiene Observaciones`)
        continue
      }
      // Las fórmulas se resuelven por key en todo el examen: evitar choques (igual que composeTemplate)
      const keys = new Set(section.template.sections.flatMap(s => s.fields.map(f => f.key)))
      let key = "observaciones"
      for (let n = 2; keys.has(key); n++) key = `observaciones__${n}`
      const order = Math.max(-1, ...section.fields.map(f => f.order)) + 1
      await tx.examField.create({ data: { sectionId: section.id, name: "Observaciones", key, fieldType: "text", order } })
      console.log(`+ ${t.template} :: ${t.section} -> Observaciones (key ${key}, order ${order})`)
    }
    if (!APPLY) throw new Error("ENSAYO")
  })
}

main()
  .then(() => console.log("Aplicado."))
  .catch(e => console.log(e.message === "ENSAYO" ? "Ensayo OK (revertido). Usa --apply para guardar." : e))
  .finally(() => prisma.$disconnect())
