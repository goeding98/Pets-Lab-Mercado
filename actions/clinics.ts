"use server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import bcrypt from "bcryptjs"
import { authOptions, clinicEmail } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"

export async function createClinic(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "clientes.editar")) throw new Error("No autorizado")

  const name = formData.get("name") as string
  const nit = (formData.get("nit") as string) || null

  const clinic = await prisma.clinic.create({
    data: {
      name,
      nit,
      address: (formData.get("address") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      contactName: (formData.get("contactName") as string) || null,
      neighborhood: (formData.get("neighborhood") as string) || null,
      city: (formData.get("city") as string) || null,
      // Cliente sin cobro: solo ADMIN lo cambia
      ...(session.user.role === "ADMIN" ? { noCharge: formData.get("noCharge") === "1" } : {}),
    },
  })

  // La dirección de la clínica queda como su primera sede; las demás se agregan en /clientes/[id]
  if (clinic.address) {
    await prisma.clinicBranch.create({
      data: { clinicId: clinic.id, name: "Principal", address: clinic.address, neighborhood: clinic.neighborhood, city: clinic.city, phone: clinic.phone },
    })
  }

  const initialPassword = nit || slugifyForPassword(name)
  const hashed = await bcrypt.hash(initialPassword, 10)

  await prisma.user.create({
    data: {
      name: clinic.name,
      email: clinicEmail(name),
      password: hashed,
      role: "CLINIC",
      clinicId: clinic.id,
    },
  })

  revalidatePath("/clientes")
  redirect(`/clientes/${clinic.id}`)
}

export async function updateClinic(id: string, formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "clientes.editar")) throw new Error("No autorizado")

  await prisma.clinic.update({
    where: { id },
    data: {
      name: formData.get("name") as string,
      nit: (formData.get("nit") as string) || null,
      address: (formData.get("address") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: (formData.get("email") as string) || null,
      contactName: (formData.get("contactName") as string) || null,
      neighborhood: (formData.get("neighborhood") as string) || null,
      city: (formData.get("city") as string) || null,
      // Cliente sin cobro: solo ADMIN lo cambia
      ...(session.user.role === "ADMIN" ? { noCharge: formData.get("noCharge") === "1" } : {}),
    },
  })

  revalidatePath("/clientes")
  revalidatePath(`/clientes/${id}`)
  redirect("/clientes")
}

function slugifyForPassword(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "")
}
