import { Prisma } from "@prisma/client"
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

// Siguiente número del año: el último + 1 (no un conteo, que repetiría números si se borra una orden)
export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const last = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: `${year}-` } },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  })
  const next = last ? Number(last.orderNumber.split("-")[1]) + 1 : 1
  return `${year}-${String(next).padStart(5, "0")}`
}

// Crea la orden con el siguiente número; si dos órdenes se crean a la vez y chocan en el número
// (único en la base), reintenta con el siguiente.
export async function createWithOrderNumber<T>(create: (orderNumber: string) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await create(await generateOrderNumber())
    } catch (e) {
      const dup = e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
      if (!dup || attempt >= 4) throw e
    }
  }
}
