"use server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import bcrypt from "bcryptjs"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { examsWithListPrice, generateOrderNumber } from "@/lib/orders"

const onlyDigits = (s: string) => s.replace(/\D/g, "")

// Registro público de una clínica nueva desde el Portal Vet. Crea la Clinic y su usuario CLINIC,
// que luego entra con su correo y contraseña.
export async function registerClinic(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const get = (k: string) => ((formData.get(k) as string) ?? "").trim()

  const email = get("email").toLowerCase()
  const contactName = get("contactName")
  const nit = get("nit")
  const name = get("name")
  const address = get("address")
  const neighborhood = get("neighborhood")
  const city = get("city")
  const password = (formData.get("password") as string) ?? ""
  const confirm = (formData.get("confirmPassword") as string) ?? ""

  if (!email || !contactName || !nit || !name || !address || !neighborhood || !city) {
    return { error: "Completa todos los campos." }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "El correo no es válido." }
  if (onlyDigits(nit).length < 5) return { error: "El NIT o cédula no es válido." }
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." }
  if (password !== confirm) return { error: "Las contraseñas no coinciden." }

  if (await prisma.user.findUnique({ where: { email } })) {
    return { error: "Ya existe una cuenta con ese correo. Inicia sesión." }
  }

  // Evitar duplicar una clínica que ya existe (p. ej. creada por el laboratorio en /clientes)
  const nitDigits = onlyDigits(nit)
  const clinicsWithNit = await prisma.clinic.findMany({ where: { nit: { not: null } }, select: { nit: true } })
  if (clinicsWithNit.some(c => onlyDigits(c.nit!) === nitDigits)) {
    return {
      error: "Ya hay una clínica registrada con ese NIT o cédula. Escríbenos por WhatsApp para darte acceso.",
    }
  }

  const hashed = await bcrypt.hash(password, 10)
  await prisma.clinic.create({
    data: {
      name,
      nit,
      email,
      address,
      contactName,
      neighborhood,
      city,
      users: {
        create: { name, email, password: hashed, role: "CLINIC" },
      },
    },
  })

  revalidatePath("/clientes")
  return { success: true }
}

// Solicitud de exámenes creada por la clínica. Queda como SOLICITADA hasta que el laboratorio
// recibe la muestra físicamente y la marca como RECIBIDA en /muestras.
export async function createPortalOrder(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "CLINIC" || !session.user.clinicId) throw new Error("No autorizado")

  const templateIds = formData.getAll("templateIds") as string[]
  if (templateIds.length === 0) throw new Error("Selecciona al menos un examen")
  const validCount = await prisma.examTemplate.count({ where: { id: { in: templateIds }, active: true } })
  if (validCount !== templateIds.length) throw new Error("Examen no válido")

  const get = (k: string) => ((formData.get(k) as string) ?? "").trim() || null
  const patientName = get("patientName")
  const species = get("species")
  if (!patientName || !species) throw new Error("Faltan datos del paciente")

  await prisma.order.create({
    data: {
      orderNumber: await generateOrderNumber(),
      patientName,
      species,
      breed: get("breed"),
      age: get("age"),
      sex: get("sex"),
      ownerName: get("ownerName"),
      requestingVet: get("requestingVet"),
      clinicId: session.user.clinicId,
      status: "SOLICITADA",
      source: "PORTAL",
      notes: get("notes"),
      exams: {
        create: await examsWithListPrice(templateIds),
      },
    },
  })

  revalidatePath("/portal-vet/dashboard")
  revalidatePath("/muestras")
  revalidatePath("/dashboard")
  redirect("/portal-vet/dashboard?enviada=1")
}
