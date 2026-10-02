"use server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"

// Sedes de una clínica. Las edita el staff con permiso de clientes, o la propia clínica (solo las suyas)
// desde el Portal Vet.
async function authorize(clinicId: string): Promise<string | null> {
  const session = await getServerSession(authOptions)
  if (!session) return "No autorizado"
  if (session.user.role === "CLINIC") return session.user.clinicId === clinicId ? null : "No autorizado"
  return can(session.user.role, "clientes.editar") ? null : "No autorizado"
}

function revalidate(clinicId: string) {
  revalidatePath(`/clientes/${clinicId}`)
  revalidatePath("/clientes")
  revalidatePath("/portal-vet/sedes")
  revalidatePath("/portal-vet/nueva")
  revalidatePath("/muestras/nueva")
}

export type BranchInput = { name: string; address: string; neighborhood: string; city: string; phone: string }

function clean(input: BranchInput) {
  const t = (s: string) => s.trim() || null
  return { name: input.name.trim(), address: input.address.trim(), neighborhood: t(input.neighborhood), city: t(input.city), phone: t(input.phone) }
}

export async function addBranch(clinicId: string, input: BranchInput): Promise<{ error?: string }> {
  const denied = await authorize(clinicId)
  if (denied) return { error: denied }
  const data = clean(input)
  if (!data.name || !data.address) return { error: "La sede necesita nombre y dirección." }
  await prisma.clinicBranch.create({ data: { clinicId, ...data } })
  revalidate(clinicId)
  return {}
}

export async function updateBranch(id: string, input: BranchInput): Promise<{ error?: string }> {
  const branch = await prisma.clinicBranch.findUnique({ where: { id }, select: { clinicId: true } })
  if (!branch) return { error: "Sede no encontrada" }
  const denied = await authorize(branch.clinicId)
  if (denied) return { error: denied }
  const data = clean(input)
  if (!data.name || !data.address) return { error: "La sede necesita nombre y dirección." }
  await prisma.clinicBranch.update({ where: { id }, data })
  revalidate(branch.clinicId)
  return {}
}

export async function deleteBranch(id: string): Promise<{ error?: string }> {
  const branch = await prisma.clinicBranch.findUnique({ where: { id }, select: { clinicId: true, _count: { select: { orders: true } } } })
  if (!branch) return { error: "Sede no encontrada" }
  const denied = await authorize(branch.clinicId)
  if (denied) return { error: denied }
  if (branch._count.orders > 0) return { error: "Esta sede ya tiene órdenes; no se puede eliminar (puedes renombrarla)." }
  await prisma.clinicBranch.delete({ where: { id } })
  revalidate(branch.clinicId)
  return {}
}
