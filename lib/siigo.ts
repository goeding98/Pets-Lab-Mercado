import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto"
import { Prisma } from "@prisma/client"
import { prisma } from "./db"

// Integración con Siigo Nube (API v1, https://api.siigo.com). Solo servidor.
// Credenciales de integración (usuario API = correo + access key, se generan en Siigo) y los valores por
// defecto de la factura (tipo de comprobante FV, forma de pago, vendedor, producto, impuesto) viven en
// LabSetting "siigo"; la access key va cifrada con NEXTAUTH_SECRET. Nunca en el código ni en el repo.

const API = "https://api.siigo.com"
const PARTNER_ID = "PetsLab"
const KEY = "siigo"

export type SiigoSettings = {
  username: string
  accessKeyEnc: string // AES-256-GCM (iv.tag.data en base64)
  documentId: number | null // comprobante de factura de venta (FV)
  paymentId: number | null // forma de pago
  sellerId: number | null // vendedor (usuario de Siigo)
  productCode: string // producto/servicio con el que se factura cada examen
  taxId: number | null // impuesto de los ítems (ej. IVA); null = sin impuesto
  taxPercent: number // para calcular el total del pago
  dueDays: number // días de plazo del pago (0 = contado)
  sendEmail: boolean // Siigo envía la factura al correo de facturación del cliente
}
export const SIIGO_DEFAULTS: Omit<SiigoSettings, "username" | "accessKeyEnc"> = {
  documentId: null, paymentId: null, sellerId: null, productCode: "", taxId: null, taxPercent: 0, dueDays: 0, sendEmail: true,
}

const cipherKey = () => createHash("sha256").update(`siigo:${process.env.NEXTAUTH_SECRET ?? ""}`).digest()
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const c = createCipheriv("aes-256-gcm", cipherKey(), iv)
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()])
  return [iv, c.getAuthTag(), data].map(b => b.toString("base64")).join(".")
}
function decryptSecret(enc: string): string {
  const [iv, tag, data] = enc.split(".").map(s => Buffer.from(s, "base64"))
  const d = createDecipheriv("aes-256-gcm", cipherKey(), iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(data), d.final()]).toString("utf8")
}

export async function getSiigoSettings(): Promise<SiigoSettings | null> {
  const row = await prisma.labSetting.findUnique({ where: { key: KEY } })
  const v = row?.value as Partial<SiigoSettings> | null
  if (!v?.username || !v.accessKeyEnc) return null
  return { ...SIIGO_DEFAULTS, ...v } as SiigoSettings
}
export async function saveSiigoSettings(s: SiigoSettings) {
  const value = s as unknown as Prisma.InputJsonValue
  await prisma.labSetting.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } })
}
export const siigoReady = (s: SiigoSettings | null): s is SiigoSettings =>
  !!s && !!s.documentId && !!s.paymentId && !!s.productCode

// ── API ────────────────────────────────────────────────────────────────────────────────────────────
export class SiigoError extends Error {}

async function token(s: Pick<SiigoSettings, "username" | "accessKeyEnc">): Promise<string> {
  const r = await fetch(`${API}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Partner-Id": PARTNER_ID },
    body: JSON.stringify({ username: s.username, access_key: decryptSecret(s.accessKeyEnc) }),
    cache: "no-store",
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.access_token) throw new SiigoError("Siigo no aceptó las credenciales (usuario API o access key).")
  return j.access_token as string
}

async function api<T>(tok: string, path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const r = await fetch(`${API}${path}`, {
    method: init?.method ?? "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}`, "Partner-Id": PARTNER_ID },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) {
    const msgs = (j?.Errors ?? j?.errors ?? []) as { Message?: string; message?: string; Params?: string[] }[]
    const text = msgs.map(m => m.Message ?? m.message).filter(Boolean).join(" · ")
    throw new SiigoError(text || `Siigo respondió ${r.status}`)
  }
  return j as T
}

// Probar credenciales (sin guardar)
export async function testSiigoCredentials(username: string, accessKey: string) {
  await token({ username, accessKeyEnc: encryptSecret(accessKey) })
}

// Listas para elegir los valores por defecto en la pantalla de configuración
export async function siigoCatalogs(s: SiigoSettings) {
  const t = await token(s)
  const [documents, payments, users, taxes, products] = await Promise.all([
    api<{ id: number; name: string; code?: number; active?: boolean; electronic_type?: string }[]>(t, "/v1/document-types?type=FV"),
    api<{ id: number; name: string; type?: string; active?: boolean }[]>(t, "/v1/payment-types?document_type=FV"),
    api<{ results?: { id: number; first_name: string; last_name: string; active?: boolean }[] }>(t, "/v1/users"),
    api<{ id: number; name: string; type?: string; percentage?: number; active?: boolean }[]>(t, "/v1/taxes"),
    api<{ results?: { code: string; name: string; active?: boolean; type?: string }[] }>(t, "/v1/products?page_size=100"),
  ])
  return {
    documents: documents.filter(d => d.active !== false).map(d => ({ id: d.id, name: `${d.name}${d.code ? ` (FV-${d.code})` : ""}${d.electronic_type ? " · electrónica" : ""}` })),
    payments: payments.filter(p => p.active !== false).map(p => ({ id: p.id, name: p.name })),
    users: (users.results ?? []).filter(u => u.active !== false).map(u => ({ id: u.id, name: `${u.first_name} ${u.last_name}`.trim() })),
    taxes: taxes.filter(x => x.active !== false).map(x => ({ id: x.id, name: x.name, percent: x.percentage ?? 0 })),
    products: (products.results ?? []).filter(p => p.active !== false).map(p => ({ code: p.code, name: p.name })),
  }
}

// ── Cliente ────────────────────────────────────────────────────────────────────────────────────────
// NIT sin puntos ni dígito de verificación ("901.234.567-7" → "901234567")
export const nitDigits = (nit: string) => nit.split("-")[0].replace(/\D/g, "")

// Dígito de verificación del NIT (DIAN)
export function nitCheckDigit(nit: string): number {
  const w = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71]
  const d = nit.replace(/\D/g, "").split("").reverse()
  const sum = d.reduce((n, c, i) => n + Number(c) * w[i], 0)
  const r = sum % 11
  return r > 1 ? 11 - r : r
}

// Ciudad → códigos DANE que pide Siigo (Valle del Cauca y principales); por defecto Cali
const CITIES: Record<string, [string, string]> = {
  cali: ["76", "76001"], palmira: ["76", "76520"], jamundi: ["76", "76364"], yumbo: ["76", "76892"],
  candelaria: ["76", "76130"], tulua: ["76", "76834"], buga: ["76", "76111"], cartago: ["76", "76147"],
  buenaventura: ["76", "76109"], bogota: ["11", "11001"], medellin: ["05", "05001"], pereira: ["66", "66001"],
  popayan: ["19", "19001"], barranquilla: ["08", "08001"], cartagena: ["13", "13001"], bucaramanga: ["68", "68001"],
}
const cityCodes = (city: string | null) => {
  const k = (city ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "")
  const [state_code, city_code] = CITIES[k] ?? CITIES.cali
  return { country_code: "Co", state_code, city_code }
}

export type SiigoClient = { name: string; nit: string | null; phone: string | null; billingEmail: string | null; address: string | null; city: string | null; contactName: string | null }

// Lo que le falta a un cliente para poder facturarle en Siigo
export function missingForSiigo(c: SiigoClient): string[] {
  return [
    !(c.nit && nitDigits(c.nit)) && "NIT o cédula",
    !c.billingEmail && "correo de facturación",
    !c.address && "dirección",
  ].filter((x): x is string => !!x)
}

async function ensureCustomer(t: string, c: SiigoClient): Promise<string> {
  const id = nitDigits(c.nit!)
  const found = await api<{ results?: { identification: string }[] }>(t, `/v1/customers?identification=${id}`)
  if (found.results?.length) return id
  // NIT de empresa (9 dígitos que empiezan por 8 o 9) → persona jurídica; si no, cédula de persona natural
  const company = id.length === 9 && /^[89]/.test(id)
  const words = c.name.trim().split(/\s+/)
  await api(t, "/v1/customers", {
    method: "POST",
    body: {
      type: "Customer",
      person_type: company ? "Company" : "Person",
      id_type: company ? "31" : "13",
      identification: id,
      ...(company ? { check_digit: String(nitCheckDigit(id)) } : {}),
      name: company ? [c.name.trim()] : [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ") || "."],
      address: { address: c.address, city: cityCodes(c.city) },
      phones: c.phone ? [{ number: c.phone.replace(/\D/g, "").slice(-10) }] : [],
      contacts: [{ first_name: (c.contactName ?? c.name).split(" ")[0], last_name: (c.contactName ?? c.name).split(" ").slice(1).join(" ") || ".", email: c.billingEmail }],
    },
  })
  return id
}

// ── Factura ────────────────────────────────────────────────────────────────────────────────────────
export type SiigoLine = { description: string; price: number }

export async function createSiigoInvoice(s: SiigoSettings, client: SiigoClient, lines: SiigoLine[], observations: string) {
  if (!siigoReady(s)) throw new SiigoError("Falta configurar Siigo (comprobante, forma de pago y producto).")
  const missing = missingForSiigo(client)
  if (missing.length) throw new SiigoError(`Al cliente le falta: ${missing.join(", ")}.`)
  const t = await token(s)
  const identification = await ensureCustomer(t, client)
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
  const due = new Date(Date.now() + s.dueDays * 86400000).toLocaleDateString("en-CA", { timeZone: "America/Bogota" })
  const items = lines.map(l => ({
    code: s.productCode,
    description: l.description.slice(0, 200),
    quantity: 1,
    price: Math.round(l.price),
    ...(s.taxId ? { taxes: [{ id: s.taxId }] } : {}),
  }))
  const total = items.reduce((n, i) => n + i.price * (1 + (s.taxId ? s.taxPercent / 100 : 0)), 0)
  const inv = await api<{ id: string; name: string; number?: number }>(t, "/v1/invoices", {
    method: "POST",
    body: {
      document: { id: s.documentId },
      date: today,
      customer: { identification, branch_office: 0 },
      ...(s.sellerId ? { seller: s.sellerId } : {}),
      observations: observations.slice(0, 4000),
      items,
      payments: [{ id: s.paymentId, value: Math.round(total * 100) / 100, due_date: due }],
      stamp: { send: true }, // factura electrónica a la DIAN
      mail: { send: s.sendEmail }, // Siigo la envía al correo del cliente
    },
  })
  return { id: inv.id, name: inv.name, total }
}
