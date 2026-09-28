import { prisma } from "./db"

export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const count = await prisma.order.count({
    where: { createdAt: { gte: new Date(year, 0, 1) } },
  })
  return `${year}-${String(count + 1).padStart(5, "0")}`
}
