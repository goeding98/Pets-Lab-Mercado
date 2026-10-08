// Agrega el examen SDMA (Química Sanguínea, $180.000) con el formato del laboratorio: resultado en ug/dL
// (técnica quimioluminiscencia, equipo VCHECK), lote y vencimiento del reactivo, y Observaciones. La tabla de
// interpretación (Normal / Elevado / Probabilidad de enfermedad renal) y la nota de hemólisis van en
// lib/referenceTables.ts. Idempotente: si ya existe, no hace nada.
//
// Sin --apply es un ensayo: hace todo dentro de la transacción y revierte.
//   node node_modules/tsx/dist/cli.mjs scripts/agregar-sdma.ts [--apply]
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")

async function main() {
  await prisma.$transaction(async tx => {
    if (await tx.examTemplate.findFirst({ where: { name: "SDMA" } })) {
      console.log("= SDMA ya existe")
      return
    }
    const t = await tx.examTemplate.create({
      data: {
        name: "SDMA",
        area: "Química Sanguínea",
        turnaround: "Diario",
        sampleType: "Sangre tubo amarillo o rojo",
        price: 180000,
        sections: {
          create: [
            {
              name: "Bioquímica Sanguínea",
              order: 0,
              fields: {
                create: [
                  { name: "SDMA", key: "sdma", unit: "ug/dL", refCanine: "0 – 14", refFeline: "0 – 14", technique: "Quimioluminiscencia - Equipo VCHECK", fieldType: "number", order: 0 },
                  { name: "Lote del reactivo", key: "sdma_lote", fieldType: "text", order: 1 },
                  { name: "Vencimiento del reactivo", key: "sdma_vencimiento", fieldType: "text", order: 2 },
                ],
              },
            },
            {
              name: "Observaciones",
              order: 1,
              fields: { create: [{ name: "Observaciones", key: "sdma_observaciones", fieldType: "text", order: 0 }] },
            },
          ],
        },
      },
      include: { sections: { include: { fields: true } } },
    })
    console.log(`+ ${t.name} | ${t.area} | $${t.price} | ${t.sections.map(s => `${s.name}: ${s.fields.map(f => f.name).join(", ")}`).join(" / ")}`)
    if (!APPLY) throw new Error("ENSAYO")
  }, { timeout: 60000, maxWait: 20000 })
}

main()
  .then(() => console.log("Aplicado."))
  .catch(e => console.log(e.message === "ENSAYO" ? "Ensayo OK (revertido). Correr con --apply para aplicar." : e))
  .finally(() => prisma.$disconnect())
