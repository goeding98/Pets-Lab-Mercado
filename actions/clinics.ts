"use server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function createClinic(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === "CLINIC") throw new Error("No autorizado")

  await prisma.clinic.create({
    data: {
      name: formData.get("name") as string,
      nit: (formData.get("nit") as string) || null,
      address: (formData.get("address") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
    },
  })

  revalidatePath("/clientes")
  redirect("/clientes")
}

export async function updateClinic(id: string, formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role === "CLINIC") throw new Error("No autorizado")

  await prisma.clinic.update({
    where: { id },
    data: {
      name: formData.get("name") as string,
      nit: (formData.get("nit") as string) || null,
      address: (formData.get("address") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
    },
  })

  revalidatePath("/clientes")
  revalidatePath(`/clientes/${id}`)
  redirect("/clientes")
}
