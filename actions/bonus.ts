"use server"
// Pago mensual del beneficio de los mensajeros (/beneficio-mensajeros): Michel, Guillermo y Comercial (canSeeBonos)
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { canSeeBonos } from "@/lib/permissions"
import { monthBonus } from "@/lib/bonus"

async function allowed() {
  const s = await getServerSession(authOptions)
  return s && canSeeBonos(s.user.role, s.user.email) ? s : null
}

// "Marcar como pagado": guarda lo confirmado en ese momento (paquetes y valor). Si después se confirman más, se puede
// volver a marcar y el pago se actualiza al total nuevo.
export async function markBonusPaid(userId: string, month: string): Promise<{ error?: string }> {
  const s = await allowed()
  if (!s) return { error: "No autorizado." }
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Mes no válido." }
  const [row] = await monthBonus(month, userId)
  if (!row || row.confirmed === 0) return { error: "Este mensajero no tiene paquetes confirmados en el mes." }
  const data = { packages: row.confirmed, amount: row.amount, paidByName: s.user.name ?? s.user.email ?? "—", paidAt: new Date() }
  await prisma.bonusPayment.upsert({ where: { userId_month: { userId, month } }, create: { userId, month, ...data }, update: data })
  revalidatePath("/beneficio-mensajeros")
  revalidatePath("/dia-a-dia")
  return {}
}

export async function undoBonusPaid(userId: string, month: string): Promise<{ error?: string }> {
  if (!(await allowed())) return { error: "No autorizado." }
  await prisma.bonusPayment.deleteMany({ where: { userId, month } })
  revalidatePath("/beneficio-mensajeros")
  revalidatePath("/dia-a-dia")
  return {}
}
