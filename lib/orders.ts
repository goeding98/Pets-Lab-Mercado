import { prisma } from "./db"

// Exámenes de una orden nueva, con el precio de lista del examen precargado (si lo tiene) para Caja
export async function examsWithListPrice(templateIds: string[]) {
  const templates = await prisma.examTemplate.findMany({
    where: { id: { in: templateIds } },
    select: { id: true, price: true },
  })
  const priceOf = new Map(templates.map(t => [t.id, t.price]))
  return templateIds.map(id => ({ templateId: id, price: priceOf.get(id) ?? 0 }))
}

export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.order.count({
    where: { createdAt: { gte: new Date(year, 0, 1) } },
  })
  return `${year}-${String(count + 1).padStart(5, "0")}`
}
