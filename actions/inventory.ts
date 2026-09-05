"use server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

async function requireStaff() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === "CLINIC") throw new Error("No autorizado")
  return session
}

export async function createInventoryItem(formData: FormData) {
  await requireStaff()

  const name = (formData.get("name") as string)?.trim()
  const unit = (formData.get("unit") as string)?.trim()
  if (!name || !unit) throw new Error("Nombre y presentación son obligatorios")

  const stock = Number(formData.get("stock") ?? 0) || 0
  const minStockRaw = formData.get("minStock") as string
  const minStock = minStockRaw ? Number(minStockRaw) : null

  await prisma.inventoryItem.create({
    data: { name, unit, stock, minStock },
  })

  revalidatePath("/inventario")
  revalidatePath("/inventario/recetas")
}

export async function updateInventoryItem(id: string, formData: FormData) {
  await requireStaff()

  const name = (formData.get("name") as string)?.trim()
  const unit = (formData.get("unit") as string)?.trim()
  if (!name || !unit) throw new Error("Nombre y presentación son obligatorios")

  const minStockRaw = formData.get("minStock") as string
  const minStock = minStockRaw ? Number(minStockRaw) : null

  await prisma.inventoryItem.update({
    where: { id },
    data: { name, unit, minStock },
  })

  revalidatePath("/inventario")
  revalidatePath("/inventario/recetas")
}

export async function deleteInventoryItem(id: string) {
  await requireStaff()
  await prisma.inventoryItem.delete({ where: { id } })
  revalidatePath("/inventario")
  revalidatePath("/inventario/recetas")
}

export async function adjustStock(itemId: string, delta: number) {
  await requireStaff()
  if (!delta) return

  await prisma.$transaction([
    prisma.inventoryItem.update({ where: { id: itemId }, data: { stock: { increment: delta } } }),
    prisma.inventoryMovement.create({ data: { itemId, quantity: delta, reason: "AJUSTE" } }),
  ])

  revalidatePath("/inventario")
}

export async function saveRecipe(templateId: string, items: { itemId: string; quantity: number }[]) {
  await requireStaff()

  const clean = items.filter(i => i.itemId && i.quantity > 0)

  await prisma.$transaction([
    prisma.recipeItem.deleteMany({ where: { templateId } }),
    ...(clean.length > 0
      ? [
          prisma.recipeItem.createMany({
            data: clean.map(i => ({ templateId, itemId: i.itemId, quantity: i.quantity })),
          }),
        ]
      : []),
  ])

  revalidatePath("/inventario/recetas")
}
