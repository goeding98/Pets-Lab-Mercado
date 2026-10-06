"use server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"
import { resolveBranch } from "@/lib/orders"
import { catalogWhere } from "@/lib/catalog"

// Corregir los datos de una muestra (errores de digitación del mensajero o de la clínica): paciente,
// tutor, clínica remitente, sede y veterinario. Solo el personal. Cada cambio queda anotado en las
// observaciones de la orden con fecha, usuario y valor anterior → nuevo.

export type OrderInfoInput = {
  patientName: string
  species: string
  breed: string
  age: string
  sex: string
  ownerName: string
  requestingVet: string
  clinicId: string // "" = sin clínica
  branchId: string
}

const SPECIES = ["Canino", "Felino", "Otro"]
const SEX: Record<string, string> = { "": "ND", M: "Macho", H: "Hembra" }
const LABELS: Record<string, string> = {
  patientName: "Paciente", species: "Especie", breed: "Raza", age: "Edad", sex: "Sexo",
  ownerName: "Tutor", requestingVet: "Veterinario", clinic: "Clínica", branch: "Sede",
}

export async function updateOrderInfo(orderId: string, input: OrderInfoInput): Promise<{ error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "muestras.crear")) return { error: "No autorizado" }

  const t = (v: string, max = 120) => v.trim().slice(0, max)
  const patientName = t(input.patientName)
  if (!patientName) return { error: "El nombre del paciente es obligatorio." }
  if (!SPECIES.includes(input.species)) return { error: "Elige la especie." }
  if (!(input.sex in SEX)) return { error: "Sexo no válido." }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      clinic: { select: { id: true, name: true } },
      branch: { select: { name: true } },
      exams: { select: { templateId: true, template: { select: { name: true } } } },
    },
  })
  if (!order) return { error: "Muestra no encontrada." }

  const clinicId = input.clinicId || null
  let branchId: string | null
  try {
    branchId = await resolveBranch(clinicId, input.branchId)
  } catch (e) {
    return { error: (e as Error).message }
  }

  // Si cambia la clínica, sus exámenes deben poder pedirse para la nueva (personalizados)
  if (clinicId !== order.clinicId) {
    const ids = Array.from(new Set(order.exams.map(e => e.templateId)))
    const ok = await prisma.examTemplate.findMany({ where: { id: { in: ids }, ...catalogWhere(clinicId) }, select: { id: true } })
    const blocked = order.exams.filter(e => !ok.some(o => o.id === e.templateId)).map(e => e.template.name)
    if (blocked.length) {
      return { error: `No se puede pasar a esa clínica: ${blocked.join(", ")} es un examen personalizado de la clínica actual. Cámbialo primero.` }
    }
  }

  const data = {
    patientName,
    species: input.species,
    breed: t(input.breed) || null,
    age: t(input.age, 60) || null,
    sex: input.sex || null,
    ownerName: t(input.ownerName) || null,
    requestingVet: t(input.requestingVet) || null,
    clinicId,
    branchId,
  }

  // Bitácora: qué cambió (valor anterior → nuevo)
  const [newClinic, newBranch] = await Promise.all([
    clinicId ? prisma.clinic.findUnique({ where: { id: clinicId }, select: { name: true } }) : null,
    branchId ? prisma.clinicBranch.findUnique({ where: { id: branchId }, select: { name: true } }) : null,
  ])
  const show = (v: string | null | undefined) => (v && v.trim() ? v.trim() : "—")
  const changes: string[] = []
  for (const k of ["patientName", "species", "breed", "age", "ownerName", "requestingVet"] as const) {
    if (show(order[k]) !== show(data[k])) changes.push(`${LABELS[k]}: ${show(order[k])} → ${show(data[k])}`)
  }
  if ((order.sex ?? "") !== (data.sex ?? "")) changes.push(`${LABELS.sex}: ${SEX[order.sex ?? ""] ?? order.sex} → ${SEX[data.sex ?? ""]}`)
  if (order.clinicId !== clinicId) changes.push(`${LABELS.clinic}: ${show(order.clinic?.name)} → ${show(newClinic?.name)}`)
  if (order.branchId !== branchId && show(order.branch?.name) !== show(newBranch?.name)) changes.push(`${LABELS.branch}: ${show(order.branch?.name)} → ${show(newBranch?.name)}`)
  if (changes.length === 0) return {}

  const date = new Date().toLocaleDateString("es-CO", { timeZone: "America/Bogota" })
  const line = `[${date}] Datos corregidos (por ${session.user.name}): ${changes.join("; ")}`
  await prisma.order.update({ where: { id: orderId }, data: { ...data, notes: order.notes ? `${order.notes}\n${line}` : line } })

  revalidatePath(`/muestras/${orderId}`)
  revalidatePath("/muestras")
  revalidatePath("/pacientes")
  revalidatePath("/caja")
  revalidatePath("/portal-vet/dashboard")
  return {}
}
