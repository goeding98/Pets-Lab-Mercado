// Pasa el Coprológico a resultado estructurado (lib/coprologico.ts): en el examen "Coprológico
// (Microscopía y Miniflotac)" y en los perfiles que lo incluyen, las secciones del coprológico
// (Examen Macroscópico / Microscópico / Flotación) se reemplazan por una sola sección "Coprológico"
// sin campos, que el formulario y el PDF pintan con su diseño propio. Aborta si alguna ya tiene
// resultados. Idempotente.
//
// Sin --apply es un ensayo: hace todo dentro de la transacción y revierte.
//   node node_modules/tsx/dist/cli.mjs scripts/coprologico-estructurado.ts [--apply]
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")
const MASTER = "Coprológico (Microscopía y Miniflotac)"

async function main() {
  await prisma.$transaction(async tx => {
    const templates = await tx.examTemplate.findMany({
      where: { active: true, OR: [{ name: MASTER }, { area: "Perfiles", sections: { some: { name: { startsWith: "Coprológico —" } } } }] },
      include: { sections: { orderBy: { order: "asc" }, include: { fields: { select: { id: true } } } } },
    })
    if (!templates.some(t => t.name === MASTER)) throw new Error(`No existe ${MASTER}`)

    for (const t of templates) {
      const old = t.name === MASTER
        ? t.sections.filter(s => s.name !== "Coprológico")
        : t.sections.filter(s => s.name.startsWith("Coprológico —"))
      if (old.length === 0) { console.log(`= ${t.name}: ya está`); continue }
      const fieldIds = old.flatMap(s => s.fields.map(f => f.id))
      const used = await tx.examResult.count({ where: { fieldId: { in: fieldIds } } })
      if (used) throw new Error(`${t.name}: hay ${used} resultados en el coprológico; no se toca`)
      const order = Math.min(...old.map(s => s.order))
      await tx.examSection.deleteMany({ where: { id: { in: old.map(s => s.id) } } })
      await tx.examSection.create({ data: { templateId: t.id, name: "Coprológico", order } })
      console.log(`+ ${t.name}: ${old.map(s => s.name).join(", ")} -> "Coprológico" (posición ${order})`)
    }
    if (!APPLY) throw new Error("ENSAYO")
  }, { timeout: 60000 })
}

main()
  .then(() => console.log("Aplicado."))
  .catch(e => console.log(e.message === "ENSAYO" ? "Ensayo OK (revertido). Usa --apply para guardar." : e))
  .finally(() => prisma.$disconnect())
