// Plan de mensajeros (/clientes/mensajeros): reparte las sedes que más muestras mandan en rutas fijas que salen y
// vuelven al laboratorio, y arma el horario del día con todas las vueltas que caben (sin tiempo muerto esperando).
// Sin dependencias: corre en el navegador.
// Supuestos: distancia por calle = línea recta × 1,4; moto a 22 km/h en Cali; 6 min por parada; jornada 8:00–17:00
// con 1 h de almuerzo; más de 12 km (en línea recta) del laboratorio queda fuera de ruta.

export const SUPUESTOS = { FACTOR_CALLE: 1.4, KMH: 22, MIN_PARADA: 6, MAX_KM_LAB: 12 }
// Jornada (minutos desde medianoche). Cada vuelta = ruta + entrega en el laboratorio; entre vueltas una pausa corta
// para imprevistos o un pedido; almuerzo antes de la primera vuelta que saldría después de las 11:45.
export const JORNADA = { INICIO: 8 * 60, FIN: 17 * 60, ALMUERZO: 60, ALMUERZO_DESDE: 11 * 60 + 45, ENTREGA_LAB: 15, PAUSA: 20, MAX_VUELTAS: 4 }

// Cada mensajero se identifica por un color (mapa, lista y PDF de instrucciones): Mensajero Rojo, Mensajero Azul…
export const MENSAJEROS = [
  { nombre: "Rojo", color: "#dc2626" },
  { nombre: "Azul", color: "#1d4ed8" },
  { nombre: "Morado", color: "#7c3aed" },
  { nombre: "Verde", color: "#0f766e" },
]
// Beneficio (pesos) por paquete de muestras no agendado
export const BONO_PAQUETE = 1500

export type Punto = { id: string; lat: number; lng: number; m: number; own: boolean }
export type Vuelta = { sale: number; vuelve: number } // minutos desde medianoche
export type Ruta<P extends Punto> = {
  orden: P[]        // paradas de la ruta fija, en orden
  pedido: P[]       // clínicas de la zona que se recogen solo si llaman (se meten en la vuelta en curso)
  km: number        // por vuelta
  min: number       // por vuelta (manejo + paradas, sin la entrega en el laboratorio)
  centro: { lat: number; lng: number } // centro de la zona (para repartir las de pedido)
  vueltas: number
  horario: Vuelta[]
  holgura: number   // minutos de la jornada que no son vuelta (pausas + final del día): pedidos e imprevistos
  kmDia: number
  muestras: number  // muestras/mes de la zona
}

const { FACTOR_CALLE, KMH, MIN_PARADA, MAX_KM_LAB } = SUPUESTOS

// Hora legible redondeada a 5 min: 630 → "10:30 a. m."
export function hora(min: number) {
  const t = Math.round(min / 5) * 5
  const h = Math.floor(t / 60), m = t % 60
  const h12 = h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "a. m." : "p. m."}`
}

// Todas las vueltas que caben en la jornada (hasta MAX_VUELTAS), volviendo al laboratorio antes del fin.
export function agenda(minRuta: number): Vuelta[] {
  const { INICIO, FIN, ALMUERZO, ALMUERZO_DESDE, ENTREGA_LAB, PAUSA, MAX_VUELTAS } = JORNADA
  const simular = (v: number) => {
    const out: Vuelta[] = []
    let t = INICIO, almorzo = false
    for (let i = 0; i < v; i++) {
      if (i > 0) t += PAUSA
      if (!almorzo && t >= ALMUERZO_DESDE) { t += ALMUERZO; almorzo = true }
      const sale = t
      t += minRuta + ENTREGA_LAB
      out.push({ sale, vuelve: t })
    }
    return out
  }
  for (let v = MAX_VUELTAS; v > 1; v--) {
    const h = simular(v)
    if (h[h.length - 1].vuelve <= FIN) return h
  }
  return simular(1)
}

type LL = { lat: number; lng: number }
export function km(a: LL, b: LL) {
  const R = 6371, rad = Math.PI / 180
  const dLa = (b.lat - a.lat) * rad, dLo = (b.lng - a.lng) * rad
  const x = Math.sin(dLa / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLo / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(x)) * FACTOR_CALLE
}
export const minutos = (k: number) => (k / KMH) * 60

// Recorrido corto: vecino más cercano desde el laboratorio y luego 2-opt; vuelve al laboratorio.
function ordenar<P extends Punto>(lab: LL, pts: P[]) {
  const rest = pts.slice()
  let ruta: P[] = []
  let cur: LL = lab
  while (rest.length) {
    let bi = 0, bd = Infinity
    rest.forEach((p, i) => { const d = km(cur, p); if (d < bd) { bd = d; bi = i } })
    cur = rest.splice(bi, 1)[0]
    ruta.push(cur as P)
  }
  // 2-opt: invertir el tramo i..j solo cambia dos aristas, así que se compara la diferencia (no el largo completo).
  let s: LL[] = [lab, ...ruta, lab]
  let mejora = true
  while (mejora) {
    mejora = false
    for (let i = 0; i < ruta.length - 1; i++) for (let j = i + 1; j < ruta.length; j++) {
      const delta = km(s[i], s[j + 1]) + km(s[i + 1], s[j + 2]) - km(s[i], s[i + 1]) - km(s[j + 1], s[j + 2])
      if (delta < -1e-9) {
        ruta = ruta.slice(0, i).concat(ruta.slice(i, j + 1).reverse(), ruta.slice(j + 1))
        s = [lab, ...ruta, lab]
        mejora = true
      }
    }
  }
  let total = 0
  let c: LL = lab
  for (const p of ruta) { total += km(c, p); c = p }
  return { orden: ruta, km: total + km(c, lab) }
}

// Reparte por sectores alrededor del laboratorio (barrido por ángulo), probando todos los cortes en k grupos
// contiguos, y se queda con el reparto en que la vuelta más larga sea la más corta.
export function calcular<P extends Punto>(lab: LL, puntos: P[], k: number, umbral: number) {
  const cerca = puntos.filter(p => km(lab, p) / FACTOR_CALLE <= MAX_KM_LAB)
  const fuera = puntos.filter(p => !cerca.includes(p))
  const dentro = cerca.filter(p => p.own || p.m >= umbral)
  const pedido = cerca.filter(p => !dentro.includes(p))

  const ang = (p: P) => Math.atan2(p.lat - lab.lat, (p.lng - lab.lng) * Math.cos((lab.lat * Math.PI) / 180))
  dentro.sort((a, b) => ang(a) - ang(b))

  // Los grupos son arcos contiguos del barrido (inicio + largo): hay a lo sumo n² distintos y cada uno se calcula
  // una sola vez.
  const n = dentro.length
  type Res = { orden: P[]; km: number; min: number }
  const cache = new Map<number, Res>()
  const arco = (inicio: number, largo: number): Res => {
    const key = inicio * (n + 1) + largo
    let r = cache.get(key)
    if (!r) {
      const g = Array.from({ length: largo }, (_, t) => dentro[(inicio + t) % n])
      const o = ordenar(lab, g)
      r = { ...o, min: minutos(o.km) + g.length * MIN_PARADA }
      cache.set(key, r)
    }
    return r
  }

  let mejor: Res[] = []
  if (n === 0) mejor = []
  else if (k <= 1) mejor = [arco(0, n)]
  else if (n <= k) mejor = dentro.map((_, i) => arco(i, 1))
  else {
    let peorMejor = Infinity
    for (let ini = 0; ini < n; ini++) {
      // cortes en k arcos contiguos que empiezan en ini; se poda si un arco ya es peor que el mejor reparto
      const cortar = (desde: number, quedan: number, acc: Res[], peor: number) => {
        if (peor >= peorMejor) return
        if (quedan === 1) {
          const ult = arco((ini + desde) % n, n - desde)
          const p = Math.max(peor, ult.min)
          if (p < peorMejor) { mejor = acc.concat([ult]); peorMejor = p }
          return
        }
        for (let c = desde + 1; c <= n - quedan + 1; c++) {
          const r = arco((ini + desde) % n, c - desde)
          cortar(c, quedan - 1, acc.concat([r]), Math.max(peor, r.min))
        }
      }
      cortar(0, k, [], 0)
    }
  }

  return completar(mejor, pedido, fuera)
}

// Centro de cada zona (ponderado por muestras de la ruta fija), clínicas "por pedido" a la zona cuyo centro les quede
// más cerca, y el horario del día. Una ruta vacía (mapa armado a mano sin paradas para ese mensajero) queda sin vueltas.
function completar<P extends Punto>(base: { orden: P[]; km: number; min: number }[], pedido: P[], fuera: P[]) {
  const rutas: Ruta<P>[] = base.map(r => {
    const w = r.orden.reduce((s, p) => s + Math.max(1, p.m), 0)
    const centro = w
      ? { lat: r.orden.reduce((s, p) => s + p.lat * Math.max(1, p.m), 0) / w, lng: r.orden.reduce((s, p) => s + p.lng * Math.max(1, p.m), 0) / w }
      : { lat: NaN, lng: NaN }
    return { orden: r.orden, km: r.km, min: r.min, centro, pedido: [], vueltas: 1, horario: [], holgura: 0, kmDia: 0, muestras: 0 }
  })
  const conParadas = rutas.filter(r => r.orden.length)
  if (conParadas.length) pedido.forEach(p => {
    let best = conParadas[0], bd = Infinity
    conParadas.forEach(r => { const d = km(r.centro, p); if (d < bd) { bd = d; best = r } })
    best.pedido.push(p)
  })
  const { INICIO, FIN, ALMUERZO, ENTREGA_LAB } = JORNADA
  for (const r of rutas) {
    r.horario = r.orden.length ? agenda(r.min) : []
    r.vueltas = r.horario.length
    r.holgura = r.vueltas ? Math.max(0, FIN - INICIO - ALMUERZO - r.vueltas * (r.min + ENTREGA_LAB)) : 0
    r.kmDia = r.km * r.vueltas
    r.muestras = r.orden.concat(r.pedido).reduce((s, p) => s + p.m, 0)
  }
  return { rutas, fuera, pedidoSinRuta: conParadas.length ? [] : pedido }
}

// Ruta en el orden en que la armó el comercial (sin reordenar): laboratorio → paradas → laboratorio
export function rutaEnOrden(lab: LL, orden: LL[]) {
  let total = 0
  let c: LL = lab
  for (const p of orden) { total += km(c, p); c = p }
  const k = orden.length ? total + km(c, lab) : 0
  return { km: k, min: orden.length ? minutos(k) + orden.length * MIN_PARADA : 0 }
}

// Plan con las rutas armadas a mano ("Armar mapa"): `ordenes[i]` = paradas en orden del mensajero i (MENSAJEROS[i]).
// Las demás clínicas con muestras quedan "por pedido" de la zona más cercana (o fuera de ruta si están lejos).
export function planManual<P extends Punto>(lab: LL, puntos: P[], ordenes: P[][]) {
  const enRuta = new Set(ordenes.flat().map(p => p.id))
  const resto = puntos.filter(p => !enRuta.has(p.id) && p.m > 0)
  const fuera = resto.filter(p => km(lab, p) / FACTOR_CALLE > MAX_KM_LAB)
  const pedido = resto.filter(p => !fuera.includes(p))
  return completar(ordenes.map(o => ({ orden: o, ...rutaEnOrden(lab, o) })), pedido, fuera)
}
