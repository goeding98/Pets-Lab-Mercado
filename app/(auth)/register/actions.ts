"use server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function registerUser(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") return { error: "No autorizado" }

  const email = (formData.get("email") as string).trim().toLowerCase()
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { error: "Ya existe un usuario con ese email." }

  const password = formData.get("password") as string
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." }

  const hashed = await bcrypt.hash(password, 10)
  const clinicIdRaw = formData.get("clinicId") as string
  const clinicId = clinicIdRaw && clinicIdRaw !== "" ? clinicIdRaw : null

  await prisma.user.create({
    data: {
      name: formData.get("name") as string,
      email,
      password: hashed,
      role: formData.get("role") as string,
      clinicId,
    },
  })

  return { success: true }
}
