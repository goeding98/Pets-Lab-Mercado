// Ubicación de las sedes de los clientes para el mapa (/clientes/mapa). Las direcciones colombianas
// ("Calle 10 # 31-143") dicen el cruce: Calle 10 con Carrera 31. Se busca ese cruce en las calles de
// OpenStreetMap (Overpass) dentro de la ciudad; si no se encuentra, la búsqueda general (Nominatim), solo si
// cae dentro de la ciudad. Mejor sin ubicar que en un lugar equivocado: en el mapa se arrastra el punto a mano.

import { prisma } from "./db"

const UA = "PetsLab-LIMS/1.0 (petslab.com.co)"
type BBox = [number, number, number, number] // sur, oeste, norte, este

const TYPES: [RegExp, string][] = [
  [/^(calle|cl|cll|clle)$/i, "Calle"],
  [/^(carrera|cra|cr|kr|kra|carera)$/i, "Carrera"],
  [/^(avenida|av|avda)$/i, "Avenida"],
  [/^(diagonal|diag|dg)$/i, "Diagonal"],
  [/^(transversal|trans|tv|tr)$/i, "Transversal"],
]

type Parsed = { type: string; num: string; suffix: string; cross: string }

// "Carrera 24D oeste #4-174" → { type: Carrera, num: 24D, suffix: Oeste, cross: 4 }
export function parseAddress(address: string): Parsed | null {
  const m = address.trim().match(/^([a-záé]+)\.?\s*(\d+)\s*([a-z])?\s*(bis)?\s*(norte|oeste|sur|este)?\s*(?:#|no\.?|n°|nº)?\s*(\d+)\s*([a-z])?\s*(?:bis)?\s*-\s*\d+/i)
  if (!m) return null
  const type = TYPES.find(([re]) => re.test(m[1]))?.[1]
  if (!type) return null
  const suffix = m[5] ? m[5][0].toUpperCase() + m[5].slice(1).toLowerCase() : ""
  return { type, num: `${m[2]}${(m[3] ?? "").toUpperCase()}${m[4] ? " Bis" : ""}`, suffix, cross: `${m[6]}${(m[7] ?? "").toUpperCase()}` }
}

// "47B" → "47 ?B" (en OSM a veces "Carrera 47B" y a veces "Carrera 47 B")
const numRe = (n: string) => n.replace(/^(\d+)([A-Z])/, "$1 ?$2").replace(" Bis", " ?Bis")

const cityBoxes = new Map<string, BBox | null>()
async function cityBox(city: string): Promise<BBox | null> {
  const key = city.trim().toLowerCase()
  if (cityBoxes.has(key)) return cityBoxes.get(key)!
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=co&city=${encodeURIComponent(city)}`, { headers: { "User-Agent": UA } })
  const j = (await r.json()) as { boundingbox?: string[] }[]
  const b = j[0]?.boundingbox?.map(Number)
  const box: BBox | null = b ? [b[0], b[2], b[1], b[3]] : null
  cityBoxes.set(key, box)
  return box
}

const dist = (a: [number, number], b: [number, number]) => {
  const dy = (a[0] - b[0]) * 111_320, dx = (a[1] - b[1]) * 111_320 * Math.cos((a[0] * Math.PI) / 180)
  return Math.hypot(dx, dy)
}
const inBox = (p: [number, number], b: BBox) => p[0] >= b[0] && p[0] <= b[2] && p[1] >= b[1] && p[1] <= b[3]

// El servidor público de Overpass a veces está saturado (502/504): se reintenta y se prueba un espejo
type OverpassResult = { elements: { tags?: { name?: string }; geometry?: { lat: number; lon: number }[] }[] }
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
async function overpass(q: string): Promise<OverpassResult | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(OVERPASS[attempt % OVERPASS.length], { method: "POST", headers: { "User-Agent": UA }, body: new URLSearchParams({ data: q }) })
      if (r.ok) return (await r.json()) as OverpassResult
    } catch { /* se reintenta */ }
    await new Promise(res => setTimeout(res, 1000 * (attempt + 1)))
  }
  return null
}

// Cruce de las dos calles: punto compartido o los dos puntos más cercanos (< 150 m)
async function intersection(p: Parsed, box: BBox): Promise<[number, number] | null> {
  const sfx = p.suffix ? ` ${p.suffix}` : ""
  const mainRe = `^${p.type} ${numRe(p.num)}${sfx}$`
  const crossTypes = p.type === "Calle" ? "Carrera|Avenida|Transversal|Diagonal" : p.type === "Diagonal" || p.type === "Transversal" ? "Calle|Carrera|Diagonal|Transversal" : "Calle|Diagonal|Transversal"
  const crossRe = `^(${crossTypes}) ${numRe(p.cross)}( (Norte|Oeste|Sur|Este))?$`
  const q = `[out:json][timeout:25];way(${box.join(",")})["highway"]["name"~"${mainRe}",i]->.a;way(${box.join(",")})["highway"]["name"~"${crossRe}",i]->.b;.a out geom;.b out geom;`
  const j = await overpass(q)
  if (!j) return null
  const main = new RegExp(mainRe, "i"), cross = new RegExp(crossRe, "i")
  const pts = (re: RegExp) => j.elements.filter(e => re.test(e.tags?.name ?? "")).flatMap(e => (e.geometry ?? []).map(g => [g.lat, g.lon] as [number, number]))
  const A = pts(main), B = pts(cross)
  let best: { d: number; p: [number, number] } | null = null
  for (const a of A) for (const b of B) {
    const d = dist(a, b)
    if (!best || d < best.d) best = { d, p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }
  }
  return best && best.d < 150 ? best.p : null
}

async function nominatim(address: string, city: string, box: BBox | null): Promise<[number, number] | null> {
  const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=co&q=${encodeURIComponent(`${address}, ${city}, Colombia`)}`, { headers: { "User-Agent": UA } })
  const j = (await r.json()) as { lat: string; lon: string; type?: string }[]
  if (!j[0]) return null
  const p: [number, number] = [Number(j[0].lat), Number(j[0].lon)]
  // Un tramo de calle cualquiera ("residential") puede estar a kilómetros: solo lugares con nombre propio
  if (j[0].type === "residential" || (box && !inBox(p, box))) return null
  return p
}

// Ubica una sede por su dirección (si no fue ubicada a mano). La usan actions/branches.ts y el botón del mapa.
export async function geocodeBranch(id: string): Promise<boolean> {
  const b = await prisma.clinicBranch.findUnique({ where: { id }, select: { address: true, city: true, geoManual: true } })
  if (!b || b.geoManual) return false
  const g = await geocodeAddress(b.address, b.city)
  await prisma.clinicBranch.update({ where: { id }, data: g ?? { lat: null, lng: null } })
  return !!g
}

export async function geocodeAddress(address: string | null, city: string | null): Promise<{ lat: number; lng: number } | null> {
  if (!address?.trim()) return null
  const c = city?.trim() || "Cali"
  try {
    const box = await cityBox(c)
    const parsed = parseAddress(address)
    const p = (parsed && box && (await intersection(parsed, box))) || (await nominatim(address, c, box))
    return p ? { lat: p[0], lng: p[1] } : null
  } catch {
    return null
  }
}
