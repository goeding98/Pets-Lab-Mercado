"use server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"
import { createCustomExamCore } from "@/lib/customExam"

// Exámenes personalizados (/personalizados): igual que una promoción (ExamTemplate compuesto con copia
// de secciones, campos, fórmulas y receta; isPromotion = true para que /rangos lo trate como copia),
// pero con nombre, categoría y precio propios y visible solo para las clínicas elegidas (isCustom +
// clients, ver lib/catalog.ts). Precio y eliminar usan las acciones de promociones.

async function requirePermission() {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "promociones")) throw new Error("No autorizado")
}

function revalidateCatalog() {
  revalidatePath("/personalizados")
  revalidatePath("/muestras/nueva")
  revalidatePath("/portal-vet/nueva")
  revalidatePath("/inventario/recetas")
}

export async function createCustomExam(input: Parameters<typeof createCustomExamCore>[0]): Promise<{ error?: string; success?: boolean }> {
  await requirePermission()
  const res = await createCustomExamCore(input)
  if (res.success) revalidateCatalog()
  return res
}

// Cambia a qué clientes les sale el examen personalizado
export async function updateCustomExamClients(id: string, clinicIds: string[]): Promise<{ error?: string }> {
  await requirePermission()
  const ids = Array.from(new Set(clinicIds))
  if (ids.length === 0) return { error: "Debe quedar al menos un cliente." }
  await prisma.examTemplate.update({
    where: { id, isCustom: true },
    data: { clients: { set: ids.map(c => ({ id: c })) } },
  })
  revalidateCatalog()
  return {}
}
