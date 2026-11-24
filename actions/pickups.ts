"use server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { can } from "@/lib/permissions"
import { markNotReady, markPickedUp } from "@/lib/pickups"

// El laboratorio (o el domiciliario) marca una recogida pedida desde el Portal Vet (permiso muestras.crear).
// Devuelve { error } en vez de lanzar: Next oculta el texto de los errores en producción.
export async function setPickupOutcome(pickupId: string, outcome: "RECOGIDA" | "NO_LISTA"): Promise<{ error?: string; late?: boolean }> {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "muestras.crear")) return { error: "No tienes permiso para marcar recogidas." }
  const by = session.user.name ?? "Laboratorio"
  try {
    if (outcome === "RECOGIDA") {
      const r = await markPickedUp(pickupId, by)
      if (r.already) return { error: "Esa recogida ya estaba marcada." }
      revalidatePath("/muestras")
      return { late: r.late }
    }
    if (!(await markNotReady(pickupId, by))) return { error: "Esa recogida ya estaba marcada." }
    revalidatePath("/muestras")
    return {}
  } catch {
    return { error: "No se pudo guardar. Intenta de nuevo." }
  }
}
