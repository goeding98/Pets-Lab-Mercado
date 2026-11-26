"use server"
// "Activar plataforma de promoción" de una clínica (permiso clientes.plataforma: ADMIN y COMERCIAL). Con ella la clínica
// pide recogidas con garantía en el Portal Vet (lib/pickups.ts) y sus pedidos llegan al Día a día de los mensajeros.
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"

export async function setClinicPlatform(clinicId: string, on: boolean): Promise<{ error?: string }> {
  const s = await getServerSession(authOptions)
  if (!s || !can(s.user.role, "clientes.plataforma")) return { error: "No tienes permiso para activar la plataforma." }
  try {
    await prisma.clinic.update({
      where: { id: clinicId },
      data: on
        ? { pickupsEnabled: true, pickupsEnabledAt: new Date(), pickupsEnabledBy: s.user.name ?? "" }
        : { pickupsEnabled: false },
    })
  } catch {
    return { error: "No se pudo guardar. Intenta de nuevo." }
  }
  revalidatePath(`/clientes/${clinicId}`)
  revalidatePath("/clientes")
  return {}
}
