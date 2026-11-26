// "Día a día" del mensajero (/dia-a-dia): su ruta de hoy según el Plan de mensajeros (lib/messengerRoutes.ts, con los
// valores por defecto: 2 mensajeros, ruta fija desde 6 muestras al mes), con los pedidos del Portal Vet de su zona
// metidos en la ruta (lib/pickups.ts) y lo que ya hizo en la vuelta actual (RouteVisit).
import { prisma } from "@/lib/db"
import { loadMessengerData, type SedePunto } from "@/lib/messengerData"
import { km, MENSAJEROS, type Vuelta } from "@/lib/messengerRoutes"
import { getManualRoutes, planFor } from "@/lib/manualRoutes"
import { bogotaDay } from "@/lib/discounts"

export const COLOR_COOKIE = "diaadia_color"
export const PLAN_MENSAJEROS = 2, PLAN_UMBRAL = 6
export const BONO_PAQUETE = 1500

export type PickupInfo = {
  id: string
  deadline: string | null
  orders: { id: string; orderNumber: string; patientName: string; species: string; age: string | null; ownerName: string | null; exams: string[] }[]
}
export type ReopenInfo = { reason: string; result: string; orders: { orderId: string; orderNumber: string; patientName: string }[] }
export type DayStop = { key: string; clinicId: string; branchId: string | null; name: string; address: string; phone: string; pickup: PickupInfo | null; extra: boolean; reopen?: ReopenInfo }
export type DoneStop = { id: string; name: string; result: string; unscheduled: boolean; at: string; orders: number }

export async function loadDay(userId: string, color: string) {
  const [{ lab, points }, manual] = await Promise.all([loadMessengerData(), getManualRoutes()])
  // El mapa armado a mano (si existe) manda; si no, el automático con los valores por defecto
  const plan = planFor(lab, points, manual, PLAN_MENSAJEROS, PLAN_UMBRAL)
  const idx = MENSAJEROS.findIndex(m => m.nombre === color)
  const route = idx >= 0 && plan.rutas[idx]?.orden.length ? plan.rutas[idx] : null
  const day = bogotaDay()

  const visits = await prisma.routeVisit.findMany({ where: { userId, day }, orderBy: { createdAt: "asc" } })
  const vuelta = visits.filter(v => v.result === "LAB").length + 1
  const keyOf = (v: { branchId: string | null; clinicId: string | null }) => v.branchId ?? `clinic:${v.clinicId}`
  // Una parada reabierta ("devolverse") ya no cuenta como hecha ni para el beneficio
  const thisRound = visits.filter(v => v.vuelta === vuelta && v.result !== "LAB" && !v.reopenedAt)
  const visited = new Set(thisRound.map(keyOf))
  const bonusToday = visits.filter(v => v.unscheduled && !v.reopenedAt).length
  // Reabiertas en esta vuelta que todavía no se han vuelto a cerrar (la más reciente primero)
  const reopened = visits
    .filter(v => v.vuelta === vuelta && v.reopenedAt && !visited.has(keyOf(v)))
    .sort((a, b) => b.reopenedAt!.getTime() - a.reopenedAt!.getTime())
    .filter((v, i, arr) => arr.findIndex(x => keyOf(x) === keyOf(v)) === i)
  const reopenOrders = reopened.length
    ? await prisma.order.findMany({ where: { id: { in: reopened.flatMap(v => v.orderIds) } }, select: { id: true, orderNumber: true, patientName: true } })
    : []

  // Pedidos del Portal Vet sin recoger: a la parada de la clínica si está en mi ruta; si no, como parada extra cuando la
  // clínica es de mi zona (o, sin plan para ella, cuando su sede queda más cerca del centro de mi zona)
  const pickups = await prisma.pickup.findMany({
    where: { status: "PENDIENTE", orders: { some: { status: "SOLICITADA" } } },
    include: {
      clinic: { select: { name: true, phone: true, address: true } },
      branch: { select: { id: true, name: true, address: true, neighborhood: true, phone: true, lat: true, lng: true } },
      orders: { where: { status: "SOLICITADA" }, select: { id: true, orderNumber: true, patientName: true, species: true, age: true, ownerName: true, exams: { select: { template: { select: { name: true } } } } } },
    },
    orderBy: { createdAt: "asc" },
  })
  const info = (p: (typeof pickups)[number]): PickupInfo => ({
    id: p.id,
    deadline: p.deadline?.toISOString() ?? null,
    orders: p.orders.map(o => ({ id: o.id, orderNumber: o.orderNumber, patientName: o.patientName, species: o.species, age: o.age, ownerName: o.ownerName, exams: o.exams.map(e => e.template.name) })),
  })
  const routeIds = new Set(route?.orden.map(s => s.id) ?? [])
  const zoneIds = new Set([...(route?.orden ?? []), ...(route?.pedido ?? [])].map(s => s.id))
  const planned = new Set(plan.rutas.flatMap(r => [...r.orden, ...r.pedido].map(s => s.id)))
  const pickupAt = new Map<string, PickupInfo>()
  const extras: DayStop[] = []
  for (const p of pickups) {
    const bid = p.branchId
    if (bid && routeIds.has(bid)) { pickupAt.set(bid, info(p)); continue }
    let mine = !!bid && zoneIds.has(bid)
    if (!mine && route && !(bid && planned.has(bid))) {
      // Clínica fuera del plan (nueva o sin muestras): la zona cuyo centro le quede más cerca; sin ubicación, a todos
      const ll = p.branch?.lat != null && p.branch?.lng != null ? { lat: p.branch.lat, lng: p.branch.lng } : null
      if (!ll) mine = true
      else {
        let nearest = -1, bd = Infinity
        plan.rutas.forEach((r, i) => { if (!r.orden.length) return; const dd = km(r.centro, ll); if (dd < bd) { bd = dd; nearest = i } })
        mine = nearest === idx
      }
    }
    if (!mine) continue
    const key = bid ?? `clinic:${p.clinicId}`
    if (visited.has(key)) continue
    extras.push({
      key, clinicId: p.clinicId, branchId: bid,
      name: p.clinic.name + (p.branch && !/principal/i.test(p.branch.name) ? ` · ${p.branch.name}` : ""),
      address: p.branch ? [p.branch.address, p.branch.neighborhood].filter(Boolean).join(", ") : p.clinic.address ?? "",
      phone: p.branch?.phone || p.clinic.phone || "",
      pickup: info(p), extra: true,
    })
  }

  const stop = (s: SedePunto): DayStop => ({ key: s.id, clinicId: s.clinicId, branchId: s.id, name: s.name, address: s.address, phone: s.phone, pickup: pickupAt.get(s.id) ?? null, extra: false })
  const remaining = (route?.orden ?? []).filter(s => !visited.has(s.id)).map(stop)
  // Los pedidos extra van justo después de la parada siguiente (el mensajero no se salta ninguna)
  let todo = remaining.length ? [remaining[0], ...extras, ...remaining.slice(1)] : extras

  // "Devolverse": la parada reabierta vuelve a ser la actual, con el motivo y las muestras que ya había registrado
  for (const v of [...reopened].reverse()) {
    const key = keyOf(v)
    const info: ReopenInfo = {
      reason: v.reopenReason ?? "",
      result: v.result,
      orders: v.orderIds.map(id => reopenOrders.find(o => o.id === id)).filter((o): o is NonNullable<typeof o> => !!o)
        .map(o => ({ orderId: o.id, orderNumber: o.orderNumber, patientName: o.patientName })),
    }
    const found = todo.find(s => s.key === key)
    const p = points.find(x => x.id === v.branchId)
    const s: DayStop = found ?? {
      key, clinicId: v.clinicId ?? "", branchId: v.branchId, name: v.name, address: p?.address ?? "", phone: p?.phone ?? "", pickup: null, extra: !routeIds.has(key),
    }
    todo = [{ ...s, reopen: info }, ...todo.filter(x => x.key !== key)]
  }

  const done: DoneStop[] = thisRound.map(v => ({ id: v.id, name: v.name, result: v.result, unscheduled: v.unscheduled, at: v.createdAt.toISOString(), orders: v.orderIds.length }))
  const horario: Vuelta[] = route?.horario ?? []
  return { color, hex: MENSAJEROS[idx]?.color ?? "#3a4a3f", hasRoute: !!route, vuelta, vueltas: horario.length, horario, todo, done, bonusToday }
}
