// Arranque de la retención de resultados por pago (lib/payment.ts), una sola vez:
// - Pets & Pets queda como cliente sin cobro (Clinic.noCharge): nunca se le retiene nada.
// - Todas las órdenes que ya existen quedan pagadas (amountPaid = precio neto en cada examen), para que
//   ninguna se bloquee de golpe. Las de Pets & Pets no se tocan (no se les cobra).
// Idempotente. Sin --apply es un ensayo: hace todo dentro de la transacción y revierte.
//   node node_modules/tsx/dist/cli.mjs scripts/pagos-iniciales.ts [--apply]
import { PrismaClient } from "@prisma/client"
import { computeNetPrice } from "../lib/billing"

const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")

async function main() {
  await prisma.$transaction(async tx => {
    const pp = await tx.clinic.updateMany({ where: { name: "Pets & Pets" }, data: { noCharge: true } })
    if (pp.count !== 1) throw new Error(`Se esperaba 1 clínica "Pets & Pets", hay ${pp.count}`)
    console.log("Pets & Pets -> cliente sin cobro")

    const exams = await tx.orderExam.findMany({
      where: { order: { OR: [{ clinicId: null }, { clinic: { noCharge: false } }] } },
      select: { id: true, price: true, discountType: true, discountValue: true, amountPaid: true, orderId: true },
    })
    let n = 0
    const orders = new Set<string>()
    for (const e of exams) {
      const net = computeNetPrice(e.price, e.discountType, e.discountValue)
      if (e.amountPaid >= net) continue
      await tx.orderExam.update({ where: { id: e.id }, data: { amountPaid: net } })
      n++
      orders.add(e.orderId)
    }
    console.log(`${n} exámenes marcados como pagados, en ${orders.size} órdenes (de ${exams.length} exámenes revisados)`)
    if (!APPLY) throw new Error("ENSAYO")
  }, { timeout: 120000, maxWait: 20000 })
}

main()
  .then(() => console.log("Aplicado."))
  .catch(e => console.log(e.message === "ENSAYO" ? "Ensayo OK (revertido). Correr con --apply para aplicar." : e))
  .finally(() => prisma.$disconnect())
