// Pasa el Coproscópico a resultado estructurado (todo el Coprológico + "Examen Microscópico" + tabla
// "Coproscópico", ver lib/coprologico.ts): sus secciones se reemplazan por una sola "Coproscópico" sin
// campos. Además la sección "Coproscópico" de "Sangre Oculta en Heces" pasa a "Sangre Oculta" para que
// no se confunda con el marcador. Aborta si hay resultados en lo que se borra. Idempotente.
//
// Sin --apply es un ensayo: hace todo dentro de la transacción y revierte.
//   node node_modules/tsx/dist/cli.mjs scripts/coproscopico-estructurado.ts [--apply]
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")
const MASTER = "Coproscópico (Azúcares Reductores, pH, Sangre Oculta, Grasa Fecal, Coloración Wright)"

async function main() {
  await prisma.$transaction(async tx => {
    const so = await tx.examSection.updateMany({
      where: { name: "Coproscópico", template: { name: "Sangre Oculta en Heces" } },
      data: { name: "Sangre Oculta" },
    })
    console.log(so.count ? "+ Sangre Oculta en Heces: sección renombrada a \"Sangre Oculta\"" : "= Sangre Oculta en Heces: ya está")

    const t = await tx.examTemplate.findFirstOrThrow({
      where: { name: MASTER, active: true },
      include: { sections: { include: { fields: { select: { id: true } } } } },
    })
    const old = t.sections.filter(s => s.name !== "Coproscópico")
    if (old.length === 0) { console.log("= Coproscópico: ya está") }
    else {
      const used = await tx.examResult.count({ where: { fieldId: { in: old.flatMap(s => s.fields.map(f => f.id)) } } })
      if (used) throw new Error(`Coproscópico: hay ${used} resultados; no se toca`)
      await tx.examSection.deleteMany({ where: { id: { in: old.map(s => s.id) } } })
      await tx.examSection.create({ data: { templateId: t.id, name: "Coproscópico", order: 0 } })
      console.log(`+ Coproscópico: ${old.map(s => s.name).join(", ")} -> "Coproscópico"`)
    }
    if (!APPLY) throw new Error("ENSAYO")
  }, { timeout: 60000 })
}

main()
  .then(() => console.log("Aplicado."))
  .catch(e => console.log(e.message === "ENSAYO" ? "Ensayo OK (revertido). Usa --apply para guardar." : e))
  .finally(() => prisma.$disconnect())
