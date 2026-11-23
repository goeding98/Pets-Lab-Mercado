"use client"
import { useEffect, useMemo, useRef, useState } from "react"
import "leaflet/dist/leaflet.css"
import { calcular, HORARIO, MENSAJEROS, SUPUESTOS } from "@/lib/messengerRoutes"
import type { SedePunto } from "@/lib/messengerData"

const COLORES = MENSAJEROS.map(x => x.color)
const nombreM = (i: number) => `Mensajero ${MENSAJEROS[i % MENSAJEROS.length].nombre}`
const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)
const hm = (min: number) => {
  const h = Math.floor(min / 60), m = Math.round(min % 60)
  return h ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min`
}

// Envolvente convexa (lng, lat) con un margen de ~500 m hacia afuera, para dibujar la zona de cada mensajero.
function zona(pts: { lat: number; lng: number }[]): [number, number][] | null {
  const p = pts.map(x => [x.lng, x.lat] as [number, number]).sort((a, b) => a[0] - b[0] || a[1] - b[1])
  if (p.length < 3) return null
  const cruz = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lo: [number, number][] = [], up: [number, number][] = []
  for (const q of p) { while (lo.length >= 2 && cruz(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q) }
  for (const q of [...p].reverse()) { while (up.length >= 2 && cruz(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q) }
  const h = lo.slice(0, -1).concat(up.slice(0, -1))
  if (h.length < 3) return null
  const cx = pts.reduce((s, x) => s + x.lng, 0) / pts.length, cy = pts.reduce((s, x) => s + x.lat, 0) / pts.length
  return h.map(([x, y]) => { const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1; return [y + (dy / d) * 0.0045, x + (dx / d) * 0.0045] })
}

export default function MessengerMap({ lab, points }: { lab: { lat: number; lng: number }; points: SedePunto[] }) {
  const box = useRef<HTMLDivElement>(null)
  const [n, setN] = useState(2)
  const [umbral, setUmbral] = useState(6)
  const [conPP, setConPP] = useState(true)
  const [error, setError] = useState("")

  const plan = useMemo(
    () => calcular(lab, points.filter(p => p.m > 0 && (conPP || !p.own)), n, umbral),
    [lab, points, n, umbral, conPP],
  )

  useEffect(() => {
    let map: import("leaflet").Map | null = null
    let cancelled = false
    ;(async () => {
      const L = (await import("leaflet")).default
      if (cancelled || !box.current) return
      map = L.map(box.current, { scrollWheelZoom: true }).setView([lab.lat, lab.lng], 13)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      // Todas las sedes en gris claro de fondo (las que no mandan muestras o no entran al plan)
      for (const p of points) {
        L.circleMarker([p.lat, p.lng], { radius: 4, color: "#fff", weight: 1, fillColor: "#9aa79f", fillOpacity: 0.7 })
          .bindPopup(`<b>${esc(p.name)}</b><br>${esc(p.address)}<br>${p.m} muestras en 30 días`)
          .addTo(map)
      }

      const bounds: [number, number][] = [[lab.lat, lab.lng]]
      plan.rutas.forEach((r, i) => {
        const c = COLORES[i % COLORES.length]
        const todas = r.orden.concat(r.pedido)
        const z = zona([...todas, r.base])
        if (z) L.polygon(z, { color: c, weight: 2, fillColor: c, fillOpacity: 0.08, dashArray: "6 6", interactive: false }).addTo(map!)
        L.polyline([[lab.lat, lab.lng], ...r.orden.map(p => [p.lat, p.lng] as [number, number]), [lab.lat, lab.lng]], { color: c, weight: 3, opacity: 0.85 }).addTo(map!)
        r.pedido.forEach(p => {
          L.circleMarker([p.lat, p.lng], { radius: 6, color: c, weight: 2, dashArray: "2 2", fillColor: "#fff", fillOpacity: 0.9 })
            .bindPopup(`<b>${esc(p.name)}</b><br>${nombreM(i)} · por pedido desde la base<br>${p.m} muestras en 30 días`)
            .addTo(map!)
          bounds.push([p.lat, p.lng])
        })
        r.orden.forEach((p, j) => {
          L.marker([p.lat, p.lng], {
            icon: L.divIcon({
              className: "",
              iconSize: [22, 22],
              iconAnchor: [11, 11],
              html: `<div style="width:22px;height:22px;border-radius:50%;background:${c};color:#fff;font:700 11px system-ui,sans-serif;display:grid;place-items:center;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.35)">${j + 1}</div>`,
            }),
          })
            .bindPopup(`<b>${esc(p.name)}</b><br>${nombreM(i)} · parada ${j + 1} de la ruta fija<br>${p.m} muestras en 30 días`)
            .bindTooltip(esc(p.name), { direction: "right", offset: [10, 0] })
            .addTo(map!)
          bounds.push([p.lat, p.lng])
        })
        L.marker([r.base.lat, r.base.lng], {
          icon: L.divIcon({
            className: "",
            iconSize: [64, 22],
            iconAnchor: [32, 11],
            html: `<div style="padding:2px 6px;background:${c};color:#fff;font:700 11px ui-monospace,monospace;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);white-space:nowrap;text-align:center">Base ${MENSAJEROS[i % MENSAJEROS.length].nombre}</div>`,
          }),
        })
          .bindPopup(`<b>Base del ${nombreM(i)}</b><br>Aquí espera entre vueltas para salir rápido a los pedidos.<br>Llega a cualquier clínica de su zona en ${hm(r.respuesta)} como máximo.`)
          .addTo(map!)
      })

      L.marker([lab.lat, lab.lng], {
        zIndexOffset: 1000,
        icon: L.divIcon({
          className: "",
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          html: `<div style="width:40px;height:40px;background:#1a1a18;border:3px solid #faf6ee;box-shadow:0 2px 6px rgba(0,0,0,.35);display:grid;place-items:center;transform:rotate(45deg)"><span style="transform:rotate(-45deg);font:600 10px ui-monospace,monospace;color:#faf6ee">LAB</span></div>`,
        }),
      })
        .bindPopup("<b>Pets &amp; Lab · Laboratorio</b><br>Colseguros · de aquí sale y aquí vuelve cada ruta.")
        .addTo(map)

      if (bounds.length > 1) map.fitBounds(L.latLngBounds(bounds).pad(0.15), { maxZoom: 15 })
    })().catch(() => setError("No se pudo cargar el mapa."))
    return () => {
      cancelled = true
      map?.remove()
    }
  }, [lab, points, plan])

  const sel = "border border-black/15 bg-white px-2 py-1 font-sans text-sm"
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 bg-salvia-50 border border-black/10 px-4 py-3 mb-3 font-sans text-sm">
        <label className="flex items-center gap-2">
          Mensajeros
          <select className={sel} value={n} onChange={e => setN(+e.target.value)}>
            {[1, 2, 3, 4].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Ruta fija para las que mandan
          <select className={sel} value={umbral} onChange={e => setUmbral(+e.target.value)}>
            {[3, 6, 10, 16].map(v => <option key={v} value={v}>{v} o más</option>)}
          </select>
          muestras al mes
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={conPP} onChange={e => setConPP(e.target.checked)} />
          Recoger también en las sedes Pets &amp; Pets
        </label>
        <a
          href={`/clientes/mensajeros/instrucciones?n=${n}&u=${umbral}&pp=${conPP ? 1 : 0}`}
          download
          className="ml-auto bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.18em] uppercase px-4 py-2.5 hover:bg-salvia-800 transition-colors"
        >
          Instrucciones para mensajeros (PDF)
        </a>
      </div>

      {error && <p className="font-sans text-xs text-red-700 mb-2">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div ref={box} className="w-full h-[70vh] min-h-[420px] border border-black/10 z-0" />

        <aside className="border border-black/10 bg-white lg:max-h-[70vh] overflow-y-auto divide-y divide-black/[0.06]">
          {plan.rutas.length === 0 && (
            <p className="px-4 py-4 font-sans text-sm text-ink-2">Ninguna sede llega al mínimo de muestras para una ruta fija.</p>
          )}
          {plan.rutas.map((r, i) => (
            <div key={i} className="px-4 py-4">
              <h2 className="font-serif text-lg font-medium flex items-center gap-2">
                <span className="w-3.5 h-3.5 inline-block" style={{ background: COLORES[i % COLORES.length] }} />
                {nombreM(i)}
              </h2>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2 font-sans text-[13px]">
                <dt className="text-ink-2">Por vuelta</dt><dd className="font-mono">{r.km.toFixed(0)} km · {hm(r.min)}</dd>
                <dt className="text-ink-2">Vueltas al día</dt><dd className="font-mono">{r.vueltas}</dd>
                <dt className="text-ink-2">Km al día (ruta)</dt><dd className="font-mono">{r.kmDia.toFixed(0)} km</dd>
                <dt className="text-ink-2">Libre para pedidos</dt><dd className="font-mono">{hm(r.libre)}</dd>
                <dt className="text-ink-2">Respuesta máx.</dt><dd className="font-mono">{hm(r.respuesta)}</dd>
                <dt className="text-ink-2">Muestras/mes zona</dt><dd className="font-mono">{r.muestras}</dd>
              </dl>
              <p className="font-sans text-xs text-ink-2 mt-2">
                {r.vueltas === 2 ? `Vuelta 1: ${HORARIO.vuelta1} · Vuelta 2: ${HORARIO.vuelta2}` : `Una vuelta: ${HORARIO.unaVuelta}`} · Sale y vuelve al laboratorio.
              </p>
              <ol className="list-decimal pl-5 mt-2 font-sans text-sm space-y-0.5">
                {r.orden.map(p => <li key={p.id}>{p.name} <span className="text-ink-2">({p.m})</span></li>)}
              </ol>
              {r.pedido.length > 0 && (
                <p className="font-sans text-xs text-ink-2 mt-2">
                  <b>Por pedido desde la base:</b> {r.pedido.map(p => `${p.name} (${p.m})`).join(", ")}
                </p>
              )}
            </div>
          ))}
          {plan.fuera.length > 0 && (
            <div className="px-4 py-4">
              <h2 className="font-serif text-lg font-medium">Fuera de ruta</h2>
              <p className="font-sans text-xs text-ink-2 mt-1">
                Más de {SUPUESTOS.MAX_KM_LAB} km del laboratorio: {plan.fuera.map(p => `${p.name} (${p.m})`).join(", ")}
              </p>
            </div>
          )}
        </aside>
      </div>

      <p className="font-sans text-[11px] text-ink-2 mt-3 max-w-4xl">
        Supuestos: jornada de 8:00 a 5:00 con 1 hora de almuerzo · moto a {SUPUESTOS.KMH} km/h promedio · {SUPUESTOS.MIN_PARADA} min por
        parada · distancia por calle = línea recta × {String(SUPUESTOS.FACTOR_CALLE).replace(".", ",")} · cada vuelta sale y vuelve al
        laboratorio. Las demás clínicas con muestras se recogen por pedido desde la base de su zona. Solo salen las sedes ubicadas en el
        mapa de clientes.
      </p>
    </>
  )
}
