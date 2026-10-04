// Pasa el Parcial de Orina a resultado estructurado (lib/orina.ts): en el examen "Parcial de Orina –
// Completo (...)" y en los perfiles que lo incluyen, las secciones de la orina (Examen Físico,
// Químico, Héller, P/C, Sedimento, Wright) se reemplazan por una sola sección "Parcial de Orina"
// sin campos, que el formulario y el PDF pintan con su diseño propio. Aborta si alguna ya tiene
// resultados. Idempotente.
//
// Sin --apply es un ensayo: hace todo dentro de la transacción y revierte.
//   node node_modules/tsx/dist/cli.mjs scripts/orina-estructurado.ts [--apply]
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")
const MASTER = "Parcial de Orina – Completo (Tirilla Urovet, Test de Héller, Relación P/C, Sedimento, Coloración Wright)"
const MARK = "Parcial de Orina"

async function main() {
  await prisma.$transaction(async tx => {
    const templates = await tx.examTemplate.findMany({
      where: { active: true, OR: [{ name: MASTER }, { area: "Perfiles", sections: { some: { name: { startsWith: `${MARK} —` } } } }] },
      include: { sections: { orderBy: { order: "asc" }, include: { fields: { select: { id: true } } } } },
    })
    if (!templates.some(t => t.name === MASTER)) throw new Error(`No existe ${MASTER}`)

    for (const t of templates) {
      const old = t.name === MASTER
        ? t.sections.filter(s => s.name !== MARK)
        : t.sections.filter(s => s.name.startsWith(`${MARK} —`))
      if (old.length === 0) { console.log(`= ${t.name}: ya está`); continue }
      const fieldIds = old.flatMap(s => s.fields.map(f => f.id))
      const used = await tx.examResult.count({ where: { fieldId: { in: fieldIds } } })
      if (used) throw new Error(`${t.name}: hay ${used} resultados en la orina; no se toca`)
      const order = Math.min(...old.map(s => s.order))
      await tx.examSection.deleteMany({ where: { id: { in: old.map(s => s.id) } } })
      await tx.examSection.create({ data: { templateId: t.id, name: MARK, order } })
      console.log(`+ ${t.name}: ${old.map(s => s.name).join(", ")} -> "${MARK}" (posición ${order})`)
    }
    if (!APPLY) throw new Error("ENSAYO")
  }, { timeout: 60000 })
}

main()
  .then(() => console.log("Aplicado."))
  .catch(e => console.log(e.message === "ENSAYO" ? "Ensayo OK (revertido). Usa --apply para guardar." : e))
  .finally(() => prisma.$disconnect())
