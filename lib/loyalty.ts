// Programa de lealtad "Club Pets & Lab". Cortes quincenales (1–15 y 16–fin de mes, hora de Colombia): se cuentan los
// PACIENTES distintos (nombre + especie + tutor) que cada clínica envió en el corte, no los exámenes. Nivel: Bronce 10–15,
// Plata 16–25, Oro 26+. Cada corte es una oportunidad: al cerrarlo se crea (o se sube) solo el descuento del MES SIGUIENTE
// completo (ClinicDiscount source LEALTAD); gana el mejor nivel de los dos cortes del mes. Con otros descuentos gana el mayor.
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
// Descuento del mes: lo que se gane en cualquiera de los dos cortes de un mes vale para TODO el mes siguiente
// (1 al último día). Gana el mejor nivel de los dos cortes.
export const monthOf = (p: Period) => p.id.slice(0, 7) // AAAA-MM
const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
export const monthName = (ym: string) => MONTH_NAMES[Number(ym.slice(5, 7)) - 1]
export function rewardWindow(p: Period) {
  const [y, m] = p.start.split("-").map(Number)
  const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1
  return { start: `${ny}-${pad(nm)}-01`, end: `${ny}-${pad(nm)}-${pad(lastDayOfMonth(ny, nm))}`, month: `${ny}-${pad(nm)}` }
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

// Cierra los cortes terminados que falten (desde PROGRAM_START) y guarda el resultado. Un descuento por clínica por mes
// ganado (loyaltyPeriod = AAAA-MM del mes en que se ganó): el primer corte lo crea; el segundo lo sube si llegó a un
// nivel mayor. Es idempotente y barato si ya está al día: lo llaman el cron diario, el dashboard, Descuentos y el cálculo
// de descuentos de cada orden nueva. El registro LabSetting "loyalty:<corte>" es el candado (si otro proceso lo creó, se salta).
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
    const month = monthOf(p)
    for (const r of results) {
      const t = tierByKey(r.tier)
      if (!t) continue
      const data = {
        percent: t.percent, areas: [], startDate: win.start, endDate: win.end,
        note: `Club Pets & Lab · nivel ${t.name} ganado en ${monthName(month)}: ${r.count} pacientes en el corte ${p.label}`,
        createdByName: LOYALTY_BY, source: "LEALTAD", loyaltyTier: t.key, loyaltyPeriod: month, loyaltyCount: r.count,
      }
      const exists = await prisma.clinicDiscount.findFirst({ where: { clinicId: r.clinicId, source: "LEALTAD", loyaltyPeriod: month } })
      if (!exists) await prisma.clinicDiscount.create({ data: { clinicId: r.clinicId, ...data } })
      else if (exists.percent < t.percent) await prisma.clinicDiscount.update({ where: { id: exists.id }, data })
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
  half: 1 | 2 // primera o segunda oportunidad del mes
  count: number // pacientes de este corte
  tier: Tier | null // nivel de este corte con lo que lleva
  secured: { tier: Tier; count: number; period: Period } | null // ganado en el primer corte del mes (ya cerrado)
  best: Tier | null // lo que hoy tiene asegurado para el mes siguiente (el mejor de los dos cortes)
  next: Tier | null // siguiente nivel por encima de best
  missing: number // pacientes que le faltan EN ESTE CORTE para next
  daysLeft: number
  projected: number // a este ritmo, cuántos pacientes al cierre del corte
  reward: { start: string; end: string; month: string } // mes del descuento
  active: { percent: number; tier: Tier | null; end: string } | null // descuento de lealtad vigente hoy
  upcoming: { percent: number; tier: Tier | null; start: string; end: string } | null // ganado, empieza después
  last: { period: Period; count: number; tier: Tier | null } | null // corte anterior
}

export async function getLoyaltyStatuses(clinicIds?: string[]): Promise<Map<string, LoyaltyStatus>> {
  await ensureLoyaltyClosed().catch(() => [])
  const today = dayKey()
  const period = periodOf(today)
  const prev = prevPeriod(period)
  const half: 1 | 2 = period.id.endsWith("-1") ? 1 : 2
  const prevInProgram = periodKey(prev.id) >= periodKey(PROGRAM_START)
  const ids = clinicIds ?? (await prisma.clinic.findMany({ where: { noCharge: false }, select: { id: true } })).map(c => c.id)
  const [counts, prevResult, discounts] = await Promise.all([
    countPatients(period, ids),
    prevInProgram ? getPeriodResult(prev.id) : Promise.resolve(null),
    prisma.clinicDiscount.findMany({ where: { clinicId: { in: ids }, source: "LEALTAD", endDate: { gte: today } }, orderBy: { percent: "desc" } }),
  ])
  const prevCounts = prevInProgram && !prevResult ? await countPatients(prev, ids) : null
  const elapsed = periodLength(period) - daysLeft(period, today) + 1
  const out = new Map<string, LoyaltyStatus>()
  for (const id of ids) {
    const count = counts.get(id) ?? 0
    const tier = tierFor(count)
    const lastCount = prevResult ? prevResult.results.find(r => r.clinicId === id)?.count ?? 0 : prevCounts?.get(id) ?? 0
    const lastTier = tierFor(lastCount)
    // Primer corte del mismo mes (solo si estamos en la segunda quincena)
    const secured = half === 2 && prevInProgram && lastTier ? { tier: lastTier, count: lastCount, period: prev } : null
    const best = [tier, secured?.tier].filter((t): t is Tier => !!t).sort((a, b) => b.percent - a.percent)[0] ?? null
    const next = TIERS.find(t => t.percent > (best?.percent ?? 0)) ?? null
    const mine = discounts.filter(d => d.clinicId === id)
    const act = mine.find(d => d.startDate <= today)
    const up = mine.filter(d => d.startDate > today).sort((a, b) => a.startDate.localeCompare(b.startDate))[0]
    out.set(id, {
      clinicId: id, period, half, count, tier, secured, best, next,
      missing: next ? next.min - count : 0,
      daysLeft: daysLeft(period, today),
      projected: elapsed >= 3 ? Math.round((count / elapsed) * periodLength(period)) : count,
      reward: rewardWindow(period),
      active: act ? { percent: act.percent, tier: tierByKey(act.loyaltyTier), end: act.endDate } : null,
      upcoming: up ? { percent: up.percent, tier: tierByKey(up.loyaltyTier), start: up.startDate, end: up.endDate } : null,
      last: prevInProgram ? { period: prev, count: lastCount, tier: lastTier } : null,
    })
  }
  return out
}

// Mensaje motivador según dónde va la clínica (Portal Vet)
export function loyaltyMessage(s: LoyaltyStatus): { title: string; body: string } {
  const mes = monthName(s.reward.month)
  const pl = (k: number) => `${k} ${k === 1 ? "paciente" : "pacientes"}`
  const second = s.half === 1 ? " Si no llegas, tienes una segunda oportunidad del 16 a fin de mes." : ""
  if (s.best?.key === "ORO") {
    return { title: `¡Nivel Oro asegurado para ${mes}! 🏆`, body: `Tendrás ${s.best.percent}% de descuento en todos tus exámenes durante todo ${mes}. Es el nivel más alto del club.` }
  }
  const n = s.next!
  if (!s.best && s.count === 0) {
    return s.half === 1
      ? { title: "Tu mes empieza aquí", body: `Con ${TIERS[0].min} pacientes en esta quincena desbloqueas ${TIERS[0].percent}% para todo ${mes}. Tienes dos oportunidades: del 1 al 15 y del 16 a fin de mes.` }
      : { title: "Segunda oportunidad del mes", body: `Con ${TIERS[0].min} pacientes en esta quincena desbloqueas ${TIERS[0].percent}% de descuento para todo ${mes}.` }
  }
  if (s.missing <= 3) {
    return {
      title: `¡Ya casi llegas a ${n.name}! 🔥`,
      body: s.best
        ? `Te faltan solo ${pl(s.missing)} en esta quincena para pasar de ${s.best.percent}% a ${n.percent}% en todo ${mes}.`
        : `Te faltan solo ${pl(s.missing)} en esta quincena para desbloquear ${n.percent}% en todo ${mes}.`,
    }
  }
  if (s.best) {
    const from = s.secured && s.secured.tier.key === s.best.key ? ` (lo ganaste en el corte ${s.secured.period.label})` : ""
    return {
      title: `¡${s.best.name} asegurado para ${mes}!`,
      body: `Ya tienes ${s.best.percent}% para todo ${mes}${from}. Con ${pl(s.missing)} en esta quincena subes a ${n.name} (${n.percent}%).${second}`,
    }
  }
  return { title: `Vas en camino a ${n.name}`, body: `Llevas ${pl(s.count)} en esta quincena. Con ${pl(s.missing)} más desbloqueas ${n.percent}% para todo ${mes}.${second}` }
}

export async function loyaltyLeaders(periodId: string) {
  const r = await getPeriodResult(periodId)
  return r ? r.results.filter(x => x.tier).length : 0
}
