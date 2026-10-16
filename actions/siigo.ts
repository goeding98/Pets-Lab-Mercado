"use server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"
import { invoiceOrders } from "@/lib/siigoInvoicing"
import {
  SIIGO_DEFAULTS, SiigoError, encryptSecret, getSiigoSettings, saveSiigoSettings, siigoCatalogs,
  testSiigoCredentials, type SiigoSettings,
} from "@/lib/siigo"

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== "ADMIN") throw new Error("No autorizado")
  return session
}
const message = (e: unknown) => (e instanceof SiigoError ? e.message : "No se pudo conectar con Siigo. Intenta de nuevo.")

// Paso 1: credenciales de integración (se prueban contra Siigo antes de guardarlas; la llave va cifrada)
export async function saveSiigoCredentials(username: string, accessKey: string): Promise<{ error?: string }> {
  await requireAdmin()
  const user = username.trim(), key = accessKey.trim()
  if (!user || !key) return { error: "Escribe el usuario API y la access key." }
  try {
    await testSiigoCredentials(user, key)
  } catch (e) {
    return { error: message(e) }
  }
  const current = await getSiigoSettings()
  await saveSiigoSettings({ ...SIIGO_DEFAULTS, ...(current ?? {}), username: user, accessKeyEnc: encryptSecret(key) })
  revalidatePath("/facturacion/siigo")
  revalidatePath("/facturacion")
  return {}
}

// Paso 2: listas de Siigo (comprobantes, formas de pago, vendedores, impuestos, productos)
export async function loadSiigoCatalogs() {
  await requireAdmin()
  const s = await getSiigoSettings()
  if (!s) return { error: "Primero conecta las credenciales." }
  try {
    return { catalogs: await siigoCatalogs(s) }
  } catch (e) {
    return { error: message(e) }
  }
}

export async function saveSiigoDefaults(d: Pick<SiigoSettings, "documentId" | "paymentCash" | "paymentTransfer" | "paymentCredit" | "sellerId" | "productCode" | "taxId" | "taxPercent" | "dueDays" | "sendEmail">): Promise<{ error?: string }> {
  await requireAdmin()
  const s = await getSiigoSettings()
  if (!s) return { error: "Primero conecta las credenciales." }
  if (!d.documentId || !d.productCode || !d.sellerId) return { error: "Elige el comprobante, el producto y el vendedor (Siigo lo exige)." }
  if (!d.paymentCash || !d.paymentTransfer || !d.paymentCredit) return { error: "Elige la forma de pago de Siigo para efectivo, transferencia y por cobrar." }
  await saveSiigoSettings({ ...s, ...d, dueDays: Math.max(0, Math.min(120, Math.round(d.dueDays || 0))) })
  revalidatePath("/facturacion/siigo")
  revalidatePath("/facturacion")
  return {}
}

export async function disconnectSiigo(): Promise<{ error?: string }> {
  await requireAdmin()
  await prisma.labSetting.deleteMany({ where: { key: "siigo" } })
  revalidatePath("/facturacion/siigo")
  revalidatePath("/facturacion")
  return {}
}

// Facturar en Siigo las órdenes elegidas de UN cliente: una factura electrónica con un ítem por examen
// (lib/siigoInvoicing.ts). consumidorFinal: a "Consumidor Final" (222222222222); sin NIT o dirección va ahí solo.
export async function invoiceInSiigo(orderIds: string[], consumidorFinal = false): Promise<{ error?: string; invoice?: string }> {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "facturacion")) return { error: "No autorizado" }
  const settings = await getSiigoSettings()
  if (!settings) return { error: "Siigo no está conectado. Un administrador debe configurarlo en Facturación → Conectar Siigo." }
  try {
    const r = await invoiceOrders(settings, orderIds, session.user.name ?? "—", consumidorFinal)
    revalidatePath("/facturacion")
    return { invoice: r.invoice }
  } catch (e) {
    return { error: message(e) }
  }
}
