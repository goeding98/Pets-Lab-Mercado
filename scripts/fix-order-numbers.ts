import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

async function main() {
  const orders = await prisma.order.findMany({ orderBy: { createdAt: "asc" } })

  // Group by year and assign sequential numbers per year
  const countByYear: Record<number, number> = {}
  for (const o of orders) {
    const year = new Date(o.createdAt).getFullYear()
    countByYear[year] = (countByYear[year] ?? 0) + 1
    const seq = countByYear[year]
    const newNumber = `${year}-${String(seq).padStart(5, "0")}`
    await prisma.order.update({ where: { id: o.id }, data: { orderNumber: newNumber } })
    console.log(`${o.orderNumber}  →  ${newNumber}`)
  }
  console.log("\nListo.")
}

main().catch(console.error).finally(() => prisma.$disconnect())
