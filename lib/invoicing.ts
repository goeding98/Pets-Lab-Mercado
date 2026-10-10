import { prisma } from "./db"
import { computeNetPrice } from "./billing"

// Facturación (/facturacion): órdenes a facturar, agrupadas por cliente, sin Pets & Pets (Clinic.noCharge,
// nunca se le cobra). Valor = precio neto de Caja (lista – descuento). Solo órdenes con algo que cobrar.
// La contadora marca cada orden como facturada con su número (Order.invoiceNumber / invoicedAt).

export type InvoiceFilter = { estado: "pendientes" | "facturadas" | "todas"; desde?: string; hasta?: string; cliente?: string }

export type InvoiceLine = { name: string; price: number; discount: number; net: number }
export type InvoiceOrder = {
  id: string; orderNumber: string; date: string; patientName: string; species: string; ownerName: string | null
  branch: string | null; lines: InvoiceLine[]; total: number; paid: number; balance: number
  completed: boolean; invoiceNumber: string | null; invoicedAt: string | null; invoicedByName: string | null
}
export type InvoiceClient = {
  key: string; name: string; nit: string | null; phone: string | null; email: string | null; billingEmail: string | null; address: string | null
  contactName: string | null; isParticular: boolean
  orders: InvoiceOrder[]; total: number; paid: number; balance: number
}

const TZ = "America/Bogota"
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ })
const valid = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)

export async function getInvoicing(f: InvoiceFilter) {
  const orders = await prisma.order.findMany({
    where: {
      OR: [{ clinicId: null }, { clinic: { noCharge: false } }],
      ...(f.estado === "pendientes" ? { invoicedAt: null } : f.estado === "facturadas" ? { invoicedAt: { not: null } } : {}),
      ...(valid(f.desde) || valid(f.hasta)
        ? { createdAt: {
            ...(valid(f.desde) ? { gte: new Date(`${f.desde}T00:00:00-05:00`) } : {}),
            ...(valid(f.hasta) ? { lt: new Date(new Date(`${f.hasta}T00:00:00-05:00`).getTime() + 86400000) } : {}),
          } }
        : {}),
      ...(f.cliente && f.cliente !== "particulares" ? { clinicId: f.cliente } : f.cliente === "particulares" ? { clinicId: null } : {}),
    },
    orderBy: { createdAt: "asc" },
    include: {
      clinic: true,
      branch: true,
      exams: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: { template: { select: { name: true } } } },
    },
  })

  const clients = new Map<string, InvoiceClient>()
  for (const o of orders) {
    const lines = o.exams.map(e => {
      const net = computeNetPrice(e.price, e.discountType, e.discountValue)
      return { name: e.template.name, price: e.price, discount: e.price - net, net }
    })
    const total = lines.reduce((n, l) => n + l.net, 0)
    if (total <= 0) continue // nada que facturar
    const paid = o.exams.reduce((n, e) => n + Math.min(e.amountPaid, computeNetPrice(e.price, e.discountType, e.discountValue)), 0)

    // Cliente = la clínica; una orden sin clínica es un particular (se factura al tutor)
    const key = o.clinicId ?? `particular:${o.id}`
    let c = clients.get(key)
    if (!c) {
      c = o.clinic
        ? {
            key, name: o.clinic.name.trim(), nit: o.clinic.nit, contactName: o.clinic.contactName,
            phone: o.clinic.phone ?? o.branch?.phone ?? null, email: o.clinic.email, billingEmail: o.clinic.billingEmail ?? o.clinic.email,
            address: [o.clinic.address ?? o.branch?.address, o.clinic.neighborhood, o.clinic.city].filter(Boolean).join(", ") || null,
            isParticular: false, orders: [], total: 0, paid: 0, balance: 0,
          }
        : {
            key, name: o.ownerName?.trim() || "Particular (sin tutor registrado)", nit: null, contactName: null,
            phone: null, email: null, billingEmail: null, address: null, isParticular: true, orders: [], total: 0, paid: 0, balance: 0,
          }
      clients.set(key, c)
    }
    c.orders.push({
      id: o.id, orderNumber: o.orderNumber, date: dayKey(o.createdAt), patientName: o.patientName, species: o.species,
      ownerName: o.ownerName, branch: o.branch ? `${o.branch.name} · ${o.branch.address}` : null,
      lines, total, paid, balance: Math.max(total - paid, 0),
      completed: o.exams.every(e => e.status === "COMPLETADO"),
      invoiceNumber: o.invoiceNumber, invoicedAt: o.invoicedAt ? dayKey(o.invoicedAt) : null, invoicedByName: o.invoicedByName,
    })
    c.total += total; c.paid += paid; c.balance += Math.max(total - paid, 0)
  }

  const list = Array.from(clients.values()).sort((a, b) => b.total - a.total)
  return {
    clients: list,
    totals: {
      clients: list.length,
      orders: list.reduce((n, c) => n + c.orders.length, 0),
      total: list.reduce((n, c) => n + c.total, 0),
      paid: list.reduce((n, c) => n + c.paid, 0),
      balance: list.reduce((n, c) => n + c.balance, 0),
    },
  }
}
