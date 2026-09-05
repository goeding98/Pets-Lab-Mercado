import type { Prisma } from "@prisma/client"

type TxClient = Prisma.TransactionClient

// Descuenta del stock los insumos de la receta del examen (una sola vez, al completarse)
export async function consumeInventoryForExam(tx: TxClient, orderExamId: string, templateId: string) {
  const recipeItems = await tx.recipeItem.findMany({ where: { templateId } })

  for (const ri of recipeItems) {
    await tx.inventoryItem.update({
      where: { id: ri.itemId },
      data: { stock: { decrement: ri.quantity } },
    })
    await tx.inventoryMovement.create({
      data: { itemId: ri.itemId, quantity: -ri.quantity, reason: "CONSUMO_EXAMEN", orderExamId },
    })
  }
}

// Reversa el consumo de un examen (se usa si un examen completado vuelve a pendiente)
export async function restoreInventoryForExam(tx: TxClient, orderExamId: string) {
  const movements = await tx.inventoryMovement.findMany({
    where: { orderExamId, reason: "CONSUMO_EXAMEN" },
  })

  for (const m of movements) {
    await tx.inventoryItem.update({
      where: { id: m.itemId },
      data: { stock: { increment: -m.quantity } },
    })
  }

  await tx.inventoryMovement.deleteMany({ where: { orderExamId, reason: "CONSUMO_EXAMEN" } })
}
