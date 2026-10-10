"use server"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"
import { computeNetPrice } from "@/lib/billing"
import {
  SIIGO_DEFAULTS, SiigoError, createSiigoInvoice, encryptSecret, getSiigoSettings, saveSiigoSettings, siigoCatalogs,
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
  if (!d.documentId || !d.productCode) return { error: "Elige el comprobante y el producto." }
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
export async function invoiceInSiigo(orderIds: string[]): Promise<{ error?: string; invoice?: string }> {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "facturacion")) return { error: "No autorizado" }
  if (orderIds.length === 0) return { error: "Selecciona al menos una orden." }

  const settings = await getSiigoSettings()
  if (!settings) return { error: "Siigo no está conectado. Un administrador debe configurarlo en Facturación → Conectar Siigo." }

  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds } },
    orderBy: { createdAt: "asc" },
    include: { clinic: true, branch: true, exams: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: { template: { select: { name: true } } } } },
  })
  if (orders.length !== orderIds.length) return { error: "Alguna orden ya no existe. Recarga la página." }
  if (orders.some(o => o.invoicedAt)) return { error: "Alguna de las órdenes ya está facturada. Recarga la página." }
  if (orders.some(o => o.clinic?.noCharge)) return { error: "Pets & Pets no se factura." }
  const clinicIds = new Set(orders.map(o => o.clinicId))
  if (clinicIds.size !== 1 || !orders[0].clinic) return { error: "Las órdenes deben ser de una misma clínica (los particulares sin NIT no se facturan desde aquí)." }

  const c = orders[0].clinic
  const branch = orders[0].branch
  const lines = orders.flatMap(o => o.exams.map(e => ({
    description: `${e.template.name} - ${o.patientName} (orden ${o.orderNumber})`,
    price: computeNetPrice(e.price, e.discountType, e.discountValue),
  }))).filter(l => l.price > 0)
  // Forma de pago según lo registrado en Petslab: lo pagado (efectivo o transferencia) y lo que falta (por cobrar)
  const split = { cash: 0, transfer: 0, credit: 0 }
  for (const o of orders) for (const e of o.exams) {
    const net = computeNetPrice(e.price, e.discountType, e.discountValue)
    if (net <= 0) continue
    const paid = Math.min(Math.max(e.amountPaid, 0), net)
    if (e.paymentMethod === "TRANSFERENCIA") split.transfer += paid
    else split.cash += paid
    split.credit += net - paid
  }
  if (lines.length === 0) return { error: "Estas órdenes no tienen valor a facturar." }

  try {
    const inv = await createSiigoInvoice(
      settings,
      {
        name: c.name, nit: c.nit, phone: c.phone ?? branch?.phone ?? null, billingEmail: c.billingEmail ?? c.email,
        address: c.address ?? branch?.address ?? null, city: c.city ?? branch?.city ?? null, contactName: c.contactName,
      },
      lines,
      split,
      `Pets & Lab · Órdenes ${orders.map(o => o.orderNumber).join(", ")}`,
    )
    await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { invoiceNumber: inv.name, invoicedAt: new Date(), invoicedByName: `${session.user.name ?? "—"} · Siigo` },
    })
    revalidatePath("/facturacion")
    return { invoice: inv.name }
  } catch (e) {
    return { error: message(e) }
  }
}
