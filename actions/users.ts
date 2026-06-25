"use server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function deleteUser(userId: string) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== "ADMIN") throw new Error("No autorizado")
  if (session.user.id === userId) throw new Error("No puedes eliminarte a ti mismo")

  await prisma.user.delete({ where: { id: userId } })
  revalidatePath("/usuarios")
}

export async function updateUser(
  userId: string,
  data: { name: string; email: string; role: string; password?: string }
) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== "ADMIN") throw new Error("No autorizado")

  const updateData: Record<string, string> = {
    name: data.name,
    email: data.email,
    role: data.role,
  }

  if (data.password && data.password.trim() !== "") {
    updateData.password = await bcrypt.hash(data.password, 10)
  }

  await prisma.user.update({ where: { id: userId }, data: updateData })
  revalidatePath("/usuarios")
}
