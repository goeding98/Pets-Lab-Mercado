"use server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import bcrypt from "bcryptjs"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"
import { DEFAULT_PORTAL_PASSWORD, isInternalPortalEmail, isValidEmail, normalizeEmail } from "@/lib/portalAccount"

async function requireEditor() {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "clientes.editar")) throw new Error("No autorizado")
  return session
}

// Clínica creada por el personal: queda con su cuenta del Portal Vet (usuario = correo de la clínica,
// clave inicial DEFAULT_PORTAL_PASSWORD) para que el veterinario vea sus resultados sin registrarse.
export async function createClinic(formData: FormData): Promise<{ error?: string }> {
  const session = await requireEditor()

  const name = ((formData.get("name") as string) ?? "").trim()
  const email = normalizeEmail(formData.get("email"))
  if (!name) return { error: "Ponle el nombre a la clínica." }
  if (!isValidEmail(email)) return { error: "El correo es obligatorio: es el usuario del Portal Vet." }
  if (await prisma.user.findUnique({ where: { email } })) {
    return { error: "Ya existe una cuenta con ese correo. Búscala en Clientes." }
  }

  const clinic = await prisma.clinic.create({
    data: {
      name,
      nit: (formData.get("nit") as string) || null,
      address: (formData.get("address") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email,
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

  await prisma.user.create({
    data: {
      name: clinic.name,
      email,
      password: await bcrypt.hash(DEFAULT_PORTAL_PASSWORD, 10),
      role: "CLINIC",
      clinicId: clinic.id,
    },
  })

  revalidatePath("/clientes")
  redirect(`/clientes/${clinic.id}`)
}

export async function updateClinic(id: string, formData: FormData): Promise<{ error?: string }> {
  const session = await requireEditor()

  const email = normalizeEmail(formData.get("email"))
  if (email && !isValidEmail(email)) return { error: "El correo no es válido." }
  const current = await prisma.clinic.findUnique({ where: { id }, include: { users: { where: { role: "CLINIC" } } } })
  if (!current) return { error: "Clínica no encontrada." }

  // El usuario del portal sigue al correo de la clínica (si era el mismo, o una cuenta antigua sin correo)
  const portalUser = current.users.find(u => isInternalPortalEmail(u.email) || u.email === normalizeEmail(current.email))
  const moveLogin = !!(email && portalUser && portalUser.email !== email)
  if (moveLogin && await prisma.user.findUnique({ where: { email } })) {
    return { error: "Ya existe otra cuenta con ese correo." }
  }

  await prisma.clinic.update({
    where: { id },
    data: {
      name: formData.get("name") as string,
      nit: (formData.get("nit") as string) || null,
      address: (formData.get("address") as string) || null,
      phone: (formData.get("phone") as string) || null,
      email: email || null,
      contactName: (formData.get("contactName") as string) || null,
      neighborhood: (formData.get("neighborhood") as string) || null,
      city: (formData.get("city") as string) || null,
      // Cliente sin cobro: solo ADMIN lo cambia
      ...(session.user.role === "ADMIN" ? { noCharge: formData.get("noCharge") === "1" } : {}),
    },
  })
  if (moveLogin) await prisma.user.update({ where: { id: portalUser!.id }, data: { email } })

  revalidatePath("/clientes")
  revalidatePath(`/clientes/${id}`)
  redirect("/clientes")
}

// Vuelve la clave del Portal Vet de la clínica a la predeterminada (ej. el veterinario la olvidó)
export async function resetClinicPassword(clinicId: string): Promise<{ error?: string }> {
  await requireEditor()
  const users = await prisma.user.findMany({ where: { clinicId, role: "CLINIC" }, select: { id: true } })
  if (users.length === 0) return { error: "Esta clínica no tiene cuenta en el portal." }
  await prisma.user.updateMany({
    where: { clinicId, role: "CLINIC" },
    data: { password: await bcrypt.hash(DEFAULT_PORTAL_PASSWORD, 10) },
  })
  return {}
}
