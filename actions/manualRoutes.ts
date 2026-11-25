"use server"
// "Armar mapa" (/clientes/mensajeros/armar, permiso rutas.editar: ADMIN y COMERCIAL). Devuelven { error }: Next oculta el
// texto de los errores lanzados en producción.
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"
import { MENSAJEROS } from "@/lib/messengerRoutes"
import { MANUAL_KEY, type ManualRoutes } from "@/lib/manualRoutes"

async function editor() {
  const s = await getServerSession(authOptions)
  return s && can(s.user.role, "rutas.editar") ? s : null
}
const refresh = () => { revalidatePath("/clientes/mensajeros"); revalidatePath("/dia-a-dia") }

// Reemplaza el mapa anterior por este (el usuario ya confirmó "¿Quieres eliminar el mapa anterior y dejar este?")
export async function saveManualRoutes(rutas: { color: string; stops: string[] }[]): Promise<{ error?: string }> {
  const s = await editor()
  if (!s) return { error: "No tienes permiso para armar el mapa." }
  const clean = rutas
    .filter(r => MENSAJEROS.some(m => m.nombre === r.color))
    .map(r => ({ color: r.color, stops: Array.from(new Set(r.stops.filter(x => typeof x === "string"))) }))
  if (!clean.some(r => r.stops.length)) return { error: "El mapa no tiene paradas." }
  // Una clínica va en una sola ruta
  const all = clean.flatMap(r => r.stops)
  if (new Set(all).size !== all.length) return { error: "Una clínica quedó en dos rutas. Déjala solo en una." }
  const located = await prisma.clinicBranch.count({ where: { id: { in: all }, lat: { not: null }, lng: { not: null } } })
  if (located !== all.length) return { error: "Hay clínicas sin ubicación en el mapa. Ubícalas antes de confirmar." }
  const value: ManualRoutes = { at: new Date().toISOString(), by: s.user.name ?? "", rutas: clean }
  await prisma.labSetting.upsert({ where: { key: MANUAL_KEY }, create: { key: MANUAL_KEY, value }, update: { value } })
  refresh()
  return {}
}

// Volver al mapa automático (el que arma el sistema según las muestras)
export async function clearManualRoutes(): Promise<{ error?: string }> {
  if (!(await editor())) return { error: "No tienes permiso para cambiar el mapa." }
  await prisma.labSetting.deleteMany({ where: { key: MANUAL_KEY } })
  refresh()
  return {}
}
