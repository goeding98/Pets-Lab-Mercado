// Rutas de mensajeros armadas a mano ("Armar mapa", /clientes/mensajeros/armar): reemplazan el plan automático en el
// Plan de mensajeros, su PDF y el "Día a día". Se guardan en LabSetting "rutas-mensajeros".
import { prisma } from "@/lib/db"
import { calcular, MENSAJEROS, planManual } from "@/lib/messengerRoutes"
import type { SedePunto } from "@/lib/messengerData"

export const MANUAL_KEY = "rutas-mensajeros"
export type ManualRoutes = { at: string; by: string; rutas: { color: string; stops: string[] }[] } // stops = ids de sede, en orden

export async function getManualRoutes(): Promise<ManualRoutes | null> {
  const s = await prisma.labSetting.findUnique({ where: { key: MANUAL_KEY } })
  const v = s?.value as ManualRoutes | undefined
  return v && Array.isArray(v.rutas) && v.rutas.some(r => r.stops.length) ? v : null
}

// Paradas de cada mensajero, alineadas con MENSAJEROS (Rojo = 0, Azul = 1…), con los datos de hoy de cada sede
export function manualOrdenes(manual: ManualRoutes, points: SedePunto[]): SedePunto[][] {
  const byId = new Map(points.map(p => [p.id, p]))
  const last = Math.max(...manual.rutas.map(r => MENSAJEROS.findIndex(m => m.nombre === r.color)))
  return Array.from({ length: last + 1 }, (_, i) => {
    const r = manual.rutas.find(x => x.color === MENSAJEROS[i].nombre)
    return (r?.stops ?? []).map(id => byId.get(id)).filter((p): p is SedePunto => !!p)
  })
}

// El plan que se usa: el armado a mano si existe; si no, el automático
export function planFor(lab: { lat: number; lng: number }, points: SedePunto[], manual: ManualRoutes | null, n = 2, umbral = 6) {
  return manual ? planManual(lab, points, manualOrdenes(manual, points)) : calcular(lab, points.filter(p => p.m > 0), n, umbral)
}
