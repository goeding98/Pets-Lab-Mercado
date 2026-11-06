// Programa de lealtad "Club Pets & Lab". Cortes quincenales (1–15 y 16–fin de mes, hora de Colombia): se cuentan los
// PACIENTES distintos (nombre + especie + tutor) que cada clínica envió en el corte, no los exámenes. Nivel: Bronce 10–15,
// Plata 16–25, Oro 26+. Al cerrar el corte se crea solo un descuento (ClinicDiscount source LEALTAD) por un mes corrido
// desde el día siguiente al corte, en todos los exámenes. Si se cruza con otro descuento gana el mayor (lib/discounts.ts).
// Las solicitudes del Portal (SOLICITADA) cuentan cuando el laboratorio recibe la muestra. Pets & Pets (noCharge) no participa.
import type { Prisma } from "@prisma/client"
import { prisma } from "./db"

const TZ = "America/Bogota"
export const PROGRAM_START = "2026-11-1" // primer corte del programa
export const LOYALTY_BY = "Sistema de lealtad (automático)"

export type TierKey = "BRONCE" | "PLATA" | "ORO"
export type Tier = { key: TierKey; name: string; min: number; percent: number; color: string; soft: string }
export const TIERS: Tier[] = [
  { key: "BRONCE", name: "Bronce", min: 10, percent: 10, color: "#a0612b", soft: "#f6e7d8" },
  { key: "PLATA", name: "Plata", min: 16, percent: 20, color: "#6b7a86", soft: "#e9eef2" },
  { key: "ORO", name: "Oro", min: 26, percent: 25, color: "#b8860b", soft: "#fbf1d3" },
]
export const tierFor = (count: number): Tier | null => [...TIERS].reverse().find(t => count >= t.min) ?? null
export const nextTier = (count: number): Tier | null => TIERS.find(t => count < t.min) ?? null
export const tierByKey = (k: string | null | undefined) => TIERS.find(t => t.key === k) ?? null

// ── Fechas ──────────────────────────────────────────────────────────────────────────────────────────
export const dayKey = (d: Date = new Date()) => d.toLocaleDateString("en-CA", { timeZone: TZ })
const lastDayOfMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate() // m 1-12
const pad = (n: number) => String(n).padStart(2, "0")

export type Period = { id: string; start: string; end: string; label: string }
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

export function periodById(id: string): Period {
  const [y, m, half] = id.split("-").map(Number)
  const end = half === 1 ? 15 : lastDayOfMonth(y, m)
  return {
    id,
    start: `${y}-${pad(m)}-${half === 1 ? "01" : "16"}`,
    end: `${y}-${pad(m)}-${pad(end)}`,
    label: `${half === 1 ? 1 : 16}–${end} ${MONTHS[m - 1]}`,
  }
}
export function periodOf(day: string = dayKey()): Period {
  const [y, m, d] = day.split("-").map(Number)
  return periodById(`${y}-${pad(m)}-${d <= 15 ? 1 : 2}`)
}
export function prevPeriod(p: Period): Period {
  const [y, m, half] = p.id.split("-").map(Number)
  if (half === 2) return periodById(`${y}-${pad(m)}-1`)
  return m === 1 ? periodById(`${y - 1}-12-2`) : periodById(`${y}-${pad(m - 1)}-2`)
}
const periodKey = (id: string) => id.split("-").map(Number).reduce((n, v, i) => n + v * [10000, 10, 1][i], 0)

function addDays(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
// Descuento ganado en un corte: un mes corrido desde el día siguiente (16 nov → 15 dic; 1 dic → 31 dic)
export function rewardWindow(p: Period) {
  const start = addDays(p.end, 1)
  const [y, m, d] = start.split("-").map(Number)
  const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1
  const end = addDays(`${ny}-${pad(nm)}-${pad(Math.min(d, lastDayOfMonth(ny, nm)))}`, -1)
  return { start, end }
}
export const daysLeft = (p: Period, today = dayKey()) =>
  Math.round((new Date(`${p.end}T12:00:00Z`).getTime() - new Date(`${today}T12:00:00Z`).getTime()) / 86400000) + 1
export const periodLength = (p: Period) => Number(p.end.slice(8)) - Number(p.start.slice(8)) + 1

// ── Conteo de pacientes ─────────────────────────────────────────────────────────────────────────────
const norm = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, " ")

// Pacientes distintos por clínica en el corte (clinicId → número)
export async function countPatients(p: Period, clinicIds?: string[]): Promise<Map<string, number>> {
  const from = new Date(`${p.start}T00:00:00-05:00`)
  const to = new Date(`${addDays(p.end, 1)}T00:00:00-05:00`)
  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: from, lt: to },
      status: { not: "SOLICITADA" },
      clinicId: clinicIds ? { in: clinicIds } : { not: null },
      clinic: { noCharge: false },
    },
    select: { clinicId: true, patientName: true, species: true, ownerName: true },
  })
  const sets = new Map<string, Set<string>>()
  for (const o of orders) {
    const set = sets.get(o.clinicId!) ?? new Set<string>()
    set.add([norm(o.patientName), norm(o.species), norm(o.ownerName)].join("|"))
    sets.set(o.clinicId!, set)
  }
  return new Map(Array.from(sets.entries()).map(([k, v]) => [k, v.size]))
}

// ── Cierre de cortes ────────────────────────────────────────────────────────────────────────────────
export type PeriodResult = { at: string; results: { clinicId: string; count: number; tier: TierKey | null }[] }
const settingKey = (id: string) => `loyalty:${id}`

export async function getPeriodResult(id: string): Promise<PeriodResult | null> {
  const row = await prisma.labSetting.findUnique({ where: { key: settingKey(id) } })
  return (row?.value as unknown as PeriodResult) ?? null
}

// Cierra los cortes terminados que falten (desde PROGRAM_START): guarda el resultado y crea los descuentos. Es
// idempotente y barato si ya está al día: lo llaman el cron diario, el dashboard, Descuentos y el cálculo de descuentos
// de cada orden nueva. El registro LabSetting "loyalty:<corte>" es el candado (si otro proceso lo creó, se salta).
export async function ensureLoyaltyClosed(): Promise<string[]> {
  const closed: string[] = []
  const pending: Period[] = []
  for (let p = prevPeriod(periodOf()); periodKey(p.id) >= periodKey(PROGRAM_START); p = prevPeriod(p)) pending.unshift(p)
  if (pending.length === 0) return closed
  const done = new Set(
    (await prisma.labSetting.findMany({ where: { key: { in: pending.map(p => settingKey(p.id)) } }, select: { key: true } })).map(r => r.key),
  )
  for (const p of pending) {
    if (done.has(settingKey(p.id))) continue
    try {
      await prisma.labSetting.create({ data: { key: settingKey(p.id), value: { at: new Date().toISOString(), results: [] } } })
    } catch {
      continue // otro proceso lo está cerrando
    }
    const counts = await countPatients(p)
    const results = Array.from(counts.entries()).map(([clinicId, count]) => ({ clinicId, count, tier: tierFor(count)?.key ?? null }))
    const win = rewardWindow(p)
    for (const r of results) {
      const t = tierByKey(r.tier)
      if (!t) continue
      const exists = await prisma.clinicDiscount.findFirst({ where: { clinicId: r.clinicId, loyaltyPeriod: p.id } })
      if (exists) continue
      await prisma.clinicDiscount.create({
        data: {
          clinicId: r.clinicId, percent: t.percent, areas: [], startDate: win.start, endDate: win.end,
          note: `Club Pets & Lab · nivel ${t.name}: ${r.count} pacientes en el corte ${p.label}`,
          createdByName: LOYALTY_BY, source: "LEALTAD", loyaltyTier: t.key, loyaltyPeriod: p.id, loyaltyCount: r.count,
        },
      })
    }
    await prisma.labSetting.update({
      where: { key: settingKey(p.id) },
      data: { value: { at: new Date().toISOString(), results } as unknown as Prisma.InputJsonValue },
    })
    closed.push(p.id)
  }
  return closed
}

// ── Vista (Portal Vet y dashboard) ──────────────────────────────────────────────────────────────────
export type LoyaltyStatus = {
  clinicId: string
  period: Period
  count: number
  tier: Tier | null
  next: Tier | null
  missing: number // pacientes que faltan para el siguiente nivel (0 en Oro)
  daysLeft: number
  projected: number // a este ritmo, cuántos pacientes al cierre
  reward: { start: string; end: string } // descuento que gana con el nivel de este corte
  active: { percent: number; tier: Tier | null; end: string } | null // descuento de lealtad vigente hoy
  upcoming: { percent: number; tier: Tier | null; start: string; end: string } | null // ganado, empieza después
  last: { period: Period; count: number; tier: Tier | null } | null // corte anterior
}

export async function getLoyaltyStatuses(clinicIds?: string[]): Promise<Map<string, LoyaltyStatus>> {
  await ensureLoyaltyClosed().catch(() => [])
  const today = dayKey()
  const period = periodOf(today)
  const prev = prevPeriod(period)
  const ids = clinicIds ?? (await prisma.clinic.findMany({ where: { noCharge: false }, select: { id: true } })).map(c => c.id)
  const [counts, prevResult, discounts] = await Promise.all([
    countPatients(period, ids),
    periodKey(prev.id) >= periodKey(PROGRAM_START) ? getPeriodResult(prev.id) : Promise.resolve(null),
    prisma.clinicDiscount.findMany({ where: { clinicId: { in: ids }, source: "LEALTAD", endDate: { gte: today } }, orderBy: { percent: "desc" } }),
  ])
  const prevCounts = prevResult ? null : await countPatients(prev, ids)
  const elapsed = periodLength(period) - daysLeft(period, today) + 1
  const out = new Map<string, LoyaltyStatus>()
  for (const id of ids) {
    const count = counts.get(id) ?? 0
    const tier = tierFor(count)
    const next = nextTier(count)
    const mine = discounts.filter(d => d.clinicId === id)
    const act = mine.find(d => d.startDate <= today)
    const up = mine.filter(d => d.startDate > today).sort((a, b) => a.startDate.localeCompare(b.startDate))[0]
    const lastCount = prevResult ? prevResult.results.find(r => r.clinicId === id)?.count ?? 0 : prevCounts?.get(id) ?? 0
    out.set(id, {
      clinicId: id, period, count, tier, next,
      missing: next ? next.min - count : 0,
      daysLeft: daysLeft(period, today),
      projected: elapsed >= 3 ? Math.round((count / elapsed) * periodLength(period)) : count,
      reward: rewardWindow(period),
      active: act ? { percent: act.percent, tier: tierByKey(act.loyaltyTier), end: act.endDate } : null,
      upcoming: up ? { percent: up.percent, tier: tierByKey(up.loyaltyTier), start: up.startDate, end: up.endDate } : null,
      // El corte anterior solo si ya era del programa (antes no dio descuento)
      last: periodKey(prev.id) >= periodKey(PROGRAM_START) ? { period: prev, count: lastCount, tier: tierFor(lastCount) } : null,
    })
  }
  return out
}

// Mensaje motivador según dónde va la clínica (Portal Vet)
const fmt = (d: string) => d.slice(8) + "/" + d.slice(5, 7)
export function loyaltyMessage(s: LoyaltyStatus): { title: string; body: string } {
  const r = s.reward
  if (s.tier?.key === "ORO") {
    return { title: `¡Nivel Oro asegurado! 🏆`, body: `Tienes ${s.tier.percent}% de descuento en todos tus exámenes del ${fmt(r.start)} al ${fmt(r.end)}. Es el nivel más alto del club.` }
  }
  if (s.count === 0) {
    return { title: "Tu quincena empieza aquí", body: `Con ${TIERS[0].min} pacientes en este corte desbloqueas ${TIERS[0].percent}% de descuento durante todo un mes.` }
  }
  const n = s.next!
  const pl = (k: number) => `${k} ${k === 1 ? "paciente" : "pacientes"}`
  if (s.missing <= 3) {
    return {
      title: `¡Ya casi llegas a ${n.name}! 🔥`,
      body: s.tier
        ? `Te faltan solo ${pl(s.missing)} para pasar de ${s.tier.percent}% a ${n.percent}% de descuento durante un mes.`
        : `Te faltan solo ${pl(s.missing)} para desbloquear ${n.percent}% de descuento durante un mes.`,
    }
  }
  if (s.tier) {
    return { title: `¡Nivel ${s.tier.name} asegurado!`, body: `Ya ganaste ${s.tier.percent}% del ${fmt(r.start)} al ${fmt(r.end)}. Te faltan ${pl(s.missing)} para ${n.name} (${n.percent}%).` }
  }
  return { title: `Vas en camino a ${n.name}`, body: `Llevas ${pl(s.count)}. Con ${pl(s.missing)} más desbloqueas ${n.percent}% de descuento durante un mes.` }
}

export async function loyaltyLeaders(periodId: string) {
  const r = await getPeriodResult(periodId)
  return r ? r.results.filter(x => x.tier).length : 0
}
