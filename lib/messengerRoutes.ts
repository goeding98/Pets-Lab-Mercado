// Plan de mensajeros (/clientes/mensajeros): reparte las sedes que más muestras mandan en rutas fijas que salen y
// vuelven al laboratorio, y sugiere una base por mensajero para los pedidos. Sin dependencias: corre en el navegador.
// Supuestos: distancia por calle = línea recta × 1,4; moto a 22 km/h en Cali; 6 min por parada; jornada 8:00–17:00
// con 1 h de almuerzo = 8 h de calle; más de 12 km (en línea recta) del laboratorio queda fuera de ruta.

export const SUPUESTOS = { FACTOR_CALLE: 1.4, KMH: 22, MIN_PARADA: 6, HORAS: 8, MAX_KM_LAB: 12 }

// Cada mensajero se identifica por un color (mapa, lista y PDF de instrucciones): Mensajero Rojo, Mensajero Azul…
export const MENSAJEROS = [
  { nombre: "Rojo", color: "#dc2626" },
  { nombre: "Azul", color: "#1d4ed8" },
  { nombre: "Morado", color: "#7c3aed" },
  { nombre: "Verde", color: "#0f766e" },
]
// Horario de las vueltas fijas y beneficio (pesos) por paquete de muestras no agendado
export const HORARIO = { vuelta1: "8:30 a. m.", vuelta2: "2:00 p. m.", unaVuelta: "9:00 a. m." }
export const BONO_PAQUETE = 1500

export type Punto = { id: string; lat: number; lng: number; m: number; own: boolean }
export type Ruta<P extends Punto> = {
  orden: P[]        // paradas de la ruta fija, en orden
  pedido: P[]       // clínicas de la zona que se recogen por pedido desde la base
  km: number        // por vuelta
  min: number       // por vuelta (manejo + paradas)
  base: { lat: number; lng: number }
  respuesta: number // minutos de la base a la clínica más lejana de la zona
  vueltas: number
  libre: number     // minutos del día libres para pedidos
  kmDia: number
  muestras: number  // muestras/mes de la zona
}

const { FACTOR_CALLE, KMH, MIN_PARADA, HORAS, MAX_KM_LAB } = SUPUESTOS

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

  // Base sugerida: centro ponderado por muestras de las clínicas de la ruta fija.
  const rutas: Ruta<P>[] = mejor.map(r => {
    const w = r.orden.reduce((s, p) => s + Math.max(1, p.m), 0)
    const base = {
      lat: r.orden.reduce((s, p) => s + p.lat * Math.max(1, p.m), 0) / w,
      lng: r.orden.reduce((s, p) => s + p.lng * Math.max(1, p.m), 0) / w,
    }
    return { orden: r.orden, km: r.km, min: r.min, base, pedido: [], respuesta: 0, vueltas: 1, libre: 0, kmDia: 0, muestras: 0 }
  })
  // Las de "por pedido" van a la zona cuya base les quede más cerca.
  if (rutas.length) pedido.forEach(p => {
    let bi = 0, bd = Infinity
    rutas.forEach((r, i) => { const d = km(r.base, p); if (d < bd) { bd = d; bi = i } })
    rutas[bi].pedido.push(p)
  })
  for (const r of rutas) {
    const todas = r.orden.concat(r.pedido)
    r.respuesta = Math.max(0, ...todas.map(p => minutos(km(r.base, p))))
    // 2 vueltas fijas al día (mañana y tarde) si quedan al menos 3 h libres para pedidos; si no, 1.
    r.vueltas = HORAS * 60 - 2 * r.min >= 180 ? 2 : 1
    r.libre = HORAS * 60 - r.vueltas * r.min
    r.kmDia = r.km * r.vueltas
    r.muestras = todas.reduce((s, p) => s + p.m, 0)
  }
  return { rutas, fuera, pedidoSinRuta: rutas.length ? [] : pedido }
}
