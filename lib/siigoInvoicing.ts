import { randomBytes } from "crypto"
import type { Prisma } from "@prisma/client"
import { prisma } from "./db"
import { computeNetPrice } from "./billing"
import { SiigoError, createSiigoInvoice, getSiigoSettings, missingForSiigo, siigoReady, type SiigoClient, type SiigoSettings } from "./siigo"

// Emisión de facturas en Siigo: la usan el botón de Facturación (actions/siigo.ts) y la facturación
// automática de cada noche (runAutoInvoicing, api/cron/facturacion). Una factura = órdenes de UN cliente.

const orderInclude = {
  clinic: true,
  branch: true,
  exams: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: { template: { select: { name: true } } } },
} satisfies Prisma.OrderInclude
type FullOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>

const TZ = "America/Bogota"
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ })
const netOf = (e: FullOrder["exams"][number]) => computeNetPrice(e.price, e.discountType, e.discountValue)

function clientOf(o: FullOrder): SiigoClient | null {
  const c = o.clinic
  if (!c) return null
  return {
    name: c.name, nit: c.nit, phone: c.phone ?? o.branch?.phone ?? null, billingEmail: c.billingEmail ?? c.email,
    address: c.address ?? o.branch?.address ?? null, city: c.city ?? o.branch?.city ?? null, contactName: c.contactName,
  }
}

// Emite UNA factura con estas órdenes. Si el cliente no tiene NIT o dirección (o es un particular), o se
// pide, va a consumidor final. Las órdenes se "reservan" antes de llamar a Siigo (invoiceNumber EMITIENDO-…)
// para que dos procesos a la vez no las facturen dos veces; si Siigo falla se liberan.
export async function invoiceOrders(settings: SiigoSettings, orderIds: string[], by: string, forceConsumidorFinal = false) {
  if (orderIds.length === 0) throw new SiigoError("Selecciona al menos una orden.")
  const claim = `EMITIENDO-${randomBytes(4).toString("hex")}`
  const claimed = await prisma.order.updateMany({
    where: { id: { in: orderIds }, invoicedAt: null },
    data: { invoiceNumber: claim, invoicedAt: new Date(), invoicedByName: `${by} · Siigo (emitiendo)` },
  })
  const release = () => prisma.order.updateMany({ where: { invoiceNumber: claim }, data: { invoiceNumber: null, invoicedAt: null, invoicedByName: null } })
  if (claimed.count !== orderIds.length) {
    await release()
    throw new SiigoError("Alguna de las órdenes ya está facturada. Recarga la página.")
  }
  try {
    const orders = await prisma.order.findMany({ where: { id: { in: orderIds } }, orderBy: { createdAt: "asc" }, include: orderInclude })
    if (orders.some(o => o.clinic?.noCharge)) throw new SiigoError("Pets & Pets no se factura.")
    if (new Set(orders.map(o => o.clinicId)).size !== 1) throw new SiigoError("Las órdenes deben ser de un mismo cliente.")

    const client = clientOf(orders[0])
    const consumidorFinal = forceConsumidorFinal || !client || missingForSiigo(client).length > 0
    const lines = orders.flatMap(o => o.exams.map(e => ({ description: `${e.template.name} - ${o.patientName} (orden ${o.orderNumber})`, price: netOf(e) }))).filter(l => l.price > 0)
    if (lines.length === 0) throw new SiigoError("Estas órdenes no tienen valor a facturar.")
    // Forma de pago según lo registrado en Petslab: lo pagado (efectivo o transferencia) y lo que falta (por cobrar)
    const split = { cash: 0, transfer: 0, credit: 0 }
    for (const o of orders) for (const e of o.exams) {
      const net = netOf(e)
      if (net <= 0) continue
      const paid = Math.min(Math.max(e.amountPaid, 0), net)
      if (e.paymentMethod === "TRANSFERENCIA") split.transfer += paid
      else split.cash += paid
      split.credit += net - paid
    }
    const who = orders[0].clinic?.name ?? (orders.map(o => o.ownerName).filter(Boolean).join(", ") || "particular")
    const inv = await createSiigoInvoice(
      settings,
      consumidorFinal ? null : client,
      lines,
      split,
      `Pets & Lab · Órdenes ${orders.map(o => o.orderNumber).join(", ")}${consumidorFinal ? ` · Cliente: ${who}` : ""}`,
    )
    await prisma.order.updateMany({
      where: { invoiceNumber: claim },
      data: { invoiceNumber: inv.name, invoicedAt: new Date(), invoicedByName: `${by} · Siigo${consumidorFinal ? " (consumidor final)" : ""}` },
    })
    return { invoice: inv.name, total: inv.total, consumidorFinal, client: who }
  } catch (e) {
    await release()
    throw e
  }
}

// ── Facturación automática ─────────────────────────────────────────────────────────────────────────
export type AutoInvoiceLog = {
  at: string
  issued: { client: string; day: string; invoice: string; orders: number; total: number; consumidorFinal: boolean }[]
  failed: { client: string; day: string; orders: number; error: string }[]
  remaining: number // grupos que no alcanzaron a emitirse en esta corrida (siguen pendientes)
}
const LOG_KEY = "siigo-auto-log"

export async function getAutoInvoiceLog(): Promise<AutoInvoiceLog | null> {
  const row = await prisma.labSetting.findUnique({ where: { key: LOG_KEY } })
  return (row?.value as AutoInvoiceLog | null) ?? null
}

// Factura todas las órdenes pendientes con valor (sin Pets & Pets): UNA factura por cliente por día de registro
// (los particulares de un mismo día van juntos a consumidor final). includeToday = también las de hoy (la corrida
// de la noche); si no, solo días anteriores. timeBudgetMs: deja de emitir al acercarse al límite de la función;
// lo que falte sale en la siguiente corrida.
export async function runAutoInvoicing(opts: { includeToday: boolean; timeBudgetMs?: number; dryRun?: boolean }) {
  const t0 = Date.now()
  const settings = await getSiigoSettings()
  if (!siigoReady(settings)) throw new SiigoError("Siigo no está configurado.")
  const today = dayKey(new Date())
  const startOfToday = new Date(`${today}T00:00:00-05:00`)
  const cutoff = opts.includeToday ? new Date(startOfToday.getTime() + 86400000) : startOfToday

  const orders = await prisma.order.findMany({
    where: { invoicedAt: null, createdAt: { lt: cutoff }, OR: [{ clinicId: null }, { clinic: { noCharge: false } }] },
    orderBy: { createdAt: "asc" },
    include: orderInclude,
  })
  const groups = new Map<string, FullOrder[]>()
  for (const o of orders) {
    if (o.exams.reduce((n, e) => n + netOf(e), 0) <= 0) continue
    const k = `${o.clinicId ?? "particular"}|${dayKey(o.createdAt)}`
    groups.set(k, [...(groups.get(k) ?? []), o])
  }

  const log: AutoInvoiceLog = { at: new Date().toISOString(), issued: [], failed: [], remaining: 0 }
  const list = Array.from(groups.entries())
  for (let i = 0; i < list.length; i++) {
    const [k, os] = list[i]
    const day = k.split("|")[1]
    const name = os[0].clinic?.name ?? "Particulares"
    if (opts.dryRun) {
      log.issued.push({ client: name, day, invoice: "(ensayo)", orders: os.length, total: os.reduce((n, o) => n + o.exams.reduce((m, e) => m + netOf(e), 0), 0), consumidorFinal: !os[0].clinic })
      continue
    }
    if (opts.timeBudgetMs && Date.now() - t0 > opts.timeBudgetMs) { log.remaining = list.length - i; break }
    try {
      const r = await invoiceOrders(settings, os.map(o => o.id), "Automática")
      log.issued.push({ client: r.client, day, invoice: r.invoice, orders: os.length, total: r.total, consumidorFinal: r.consumidorFinal })
    } catch (e) {
      log.failed.push({ client: name, day, orders: os.length, error: e instanceof Error ? e.message : String(e) })
    }
  }
  if (!opts.dryRun) {
    const value = log as unknown as Prisma.InputJsonValue
    await prisma.labSetting.upsert({ where: { key: LOG_KEY }, create: { key: LOG_KEY, value }, update: { value } })
  }
  return log
}
