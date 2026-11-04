"use server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"
import { geocodeBranch } from "@/lib/geocode"

// Mapa de clientes (/clientes/mapa): ubicar sedes y corregirlas arrastrando el punto (permiso clientes.editar)

async function requireEdit() {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "clientes.editar")) throw new Error("No autorizado")
}

// Botón "Ubicar las que faltan": las sedes sin coordenadas (p. ej. creadas desde el registro del Portal Vet)
export async function locateMissingBranches(): Promise<{ located: number; missing: number }> {
  await requireEdit()
  const t0 = Date.now()
  const pending = await prisma.clinicBranch.findMany({ where: { lat: null, geoManual: false }, select: { id: true } })
  let located = 0
  for (const b of pending) {
    if (Date.now() - t0 > 45_000) break // límite de tiempo de la función; lo que falte, en otro clic
    if (await geocodeBranch(b.id)) located++
  }
  revalidatePath("/clientes/mapa")
  return { located, missing: (await prisma.clinicBranch.count({ where: { lat: null } })) }
}

// Arrastrar el punto en el mapa: queda ubicada a mano y ya no se recalcula sola
export async function setBranchLocation(id: string, lat: number, lng: number): Promise<{ error?: string }> {
  await requireEdit()
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { error: "Ubicación no válida" }
  await prisma.clinicBranch.update({ where: { id }, data: { lat, lng, geoManual: true } })
  revalidatePath("/clientes/mapa")
  return {}
}
