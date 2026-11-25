"use client"
// "Armar mapa": el comercial arma a mano la ruta de cada mensajero tocando clínicas (lista o mapa) en orden. Muestra en vivo
// km, tiempo por vuelta y horario (lib/messengerRoutes.ts). Las clínicas sin ubicación se ubican tocando el mapa
// (actions/geo.ts). "Confirmar" pide reemplazar el mapa anterior y lo guarda (actions/manualRoutes.ts).
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import "leaflet/dist/leaflet.css"
import { agenda, hora, rutaEnOrden } from "@/lib/messengerRoutes"
import { saveManualRoutes } from "@/actions/manualRoutes"
import { setBranchLocation } from "@/actions/geo"

export type BuilderPoint = { id: string; name: string; address: string; lat: number | null; lng: number | null; m: number; own: boolean }
type Color = { nombre: string; color: string }

const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)
const dur = (min: number) => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min` }

export default function RouteBuilder({ lab, points: initial, current, colors }: {
  lab: { lat: number; lng: number }
  points: BuilderPoint[]
  current: { color: string; stops: string[] }[]
  colors: Color[]
}) {
  const router = useRouter()
  const [points, setPoints] = useState(initial)
  const [count, setCount] = useState(Math.max(2, current.length))
  const [routes, setRoutes] = useState<Record<string, string[]>>({}) // empieza vacío
  const [active, setActive] = useState(colors[0].nombre)
  const [q, setQ] = useState("")
  const [locating, setLocating] = useState<BuilderPoint | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [error, setError] = useState("")
  const [pending, start] = useTransition()
  const box = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import("leaflet").Map | null>(null)
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null)
  const LRef = useRef<typeof import("leaflet") | null>(null)
  const [ready, setReady] = useState(false)

  const shown = colors.slice(0, count)
  const byId = useMemo(() => new Map(points.map(p => [p.id, p])), [points])
  const owner = (id: string) => shown.find(c => (routes[c.nombre] ?? []).includes(id))
  const hex = (name: string) => colors.find(c => c.nombre === name)?.color ?? "#3a4a3f"

  const add = (id: string) => setRoutes(r => {
    const next: Record<string, string[]> = {}
    for (const [k, v] of Object.entries(r)) next[k] = v.filter(x => x !== id) // una clínica va en una sola ruta
    next[active] = [...(next[active] ?? []), id]
    return next
  })
  const remove = (id: string) => setRoutes(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v.filter(x => x !== id)])))
  const move = (id: string, d: -1 | 1) => setRoutes(r => {
    const list = [...(r[active] ?? [])], i = list.indexOf(id), j = i + d
    if (i < 0 || j < 0 || j >= list.length) return r
    ;[list[i], list[j]] = [list[j], list[i]]
    return { ...r, [active]: list }
  })

  // Estadísticas de cada ruta: km y tiempo por vuelta (laboratorio → paradas en este orden → laboratorio), horario
  const stats = useMemo(() => Object.fromEntries(shown.map(c => {
    const ps = (routes[c.nombre] ?? []).map(id => byId.get(id)).filter((p): p is BuilderPoint => !!p && p.lat != null)
    const r = rutaEnOrden(lab, ps.map(p => ({ lat: p.lat!, lng: p.lng! })))
    return [c.nombre, { ...r, horario: ps.length ? agenda(r.min) : [], muestras: ps.reduce((n, p) => n + p.m, 0) }]
  })), [routes, byId, lab, shown])

  // Mapa (Leaflet solo en el navegador)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const L = (await import("leaflet")).default
      if (cancelled || !box.current || mapRef.current) return
      LRef.current = L
      const map = L.map(box.current, { scrollWheelZoom: true }).setView([lab.lat, lab.lng], 13)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(map)
      mapRef.current = map
      layerRef.current = L.layerGroup().addTo(map)
      setReady(true)
    })()
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null }
  }, [lab])

  // Ubicar una clínica: el siguiente toque en el mapa la guarda ahí
  useEffect(() => {
    const map = mapRef.current
    if (!map || !locating) return
    const box = map.getContainer()
    box.style.cursor = "crosshair"
    const onClick = (e: import("leaflet").LeafletMouseEvent) => {
      const p = locating
      start(async () => {
        setError("")
        const r = await setBranchLocation(p.id, e.latlng.lat, e.latlng.lng).catch(() => ({ error: "No se pudo guardar la ubicación." }))
        if (r?.error) { setError(r.error); return }
        setPoints(ps => ps.map(x => (x.id === p.id ? { ...x, lat: e.latlng.lat, lng: e.latlng.lng } : x)))
        setLocating(null)
      })
    }
    map.on("click", onClick)
    return () => { map.off("click", onClick); box.style.cursor = "" }
  }, [locating, ready])

  // Dibujo: todas las clínicas en gris; las de una ruta con su color y número; la línea de cada ruta
  useEffect(() => {
    const L = LRef.current, layer = layerRef.current
    if (!L || !layer) return
    layer.clearLayers()
    for (const p of points) {
      if (p.lat == null || p.lng == null) continue
      const o = owner(p.id)
      if (o) continue
      L.circleMarker([p.lat, p.lng], { radius: 6 + Math.min(8, Math.sqrt(p.m)), color: "#fff", weight: 1.5, fillColor: p.m ? "#7a947c" : "#b9b4a8", fillOpacity: 0.85 })
        .bindTooltip(`${esc(p.name)} · ${p.m} muestras`, { direction: "top" })
        .on("click", () => { if (!locating) add(p.id) })
        .addTo(layer)
    }
    for (const c of shown) {
      const ps = (routes[c.nombre] ?? []).map(id => byId.get(id)).filter((p): p is BuilderPoint => !!p && p.lat != null)
      if (ps.length) L.polyline([[lab.lat, lab.lng], ...ps.map(p => [p.lat!, p.lng!] as [number, number]), [lab.lat, lab.lng]], { color: c.color, weight: 3, opacity: c.nombre === active ? 0.9 : 0.45 }).addTo(layer)
      ps.forEach((p, i) => L.marker([p.lat!, p.lng!], {
        icon: L.divIcon({ className: "", iconSize: [24, 24], iconAnchor: [12, 12], html: `<div style="width:24px;height:24px;border-radius:50%;background:${c.color};color:#fff;font:700 11px system-ui;display:grid;place-items:center;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.35)">${i + 1}</div>` }),
      }).bindTooltip(`${esc(p.name)} · ${c.nombre} #${i + 1}`, { direction: "top" }).addTo(layer))
    }
    L.marker([lab.lat, lab.lng], {
      zIndexOffset: 1000,
      icon: L.divIcon({ className: "", iconSize: [34, 34], iconAnchor: [17, 17], html: `<div style="width:34px;height:34px;background:#1a1a18;border:3px solid #faf6ee;display:grid;place-items:center;transform:rotate(45deg)"><span style="transform:rotate(-45deg);font:600 9px ui-monospace,monospace;color:#faf6ee">LAB</span></div>` }),
    }).bindTooltip("Laboratorio", { direction: "top" }).addTo(layer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, routes, active, count, ready, locating])

  const list = points.filter(p => !q.trim() || `${p.name} ${p.address}`.toLowerCase().includes(q.trim().toLowerCase()))
  const activeStops = (routes[active] ?? []).map(id => byId.get(id)).filter((p): p is BuilderPoint => !!p)
  const totalStops = shown.reduce((n, c) => n + (routes[c.nombre]?.length ?? 0), 0)
  const unassignedWithSamples = points.filter(p => p.m > 0 && p.lat != null && !owner(p.id))
  const st = stats[active]

  return (
    <div className="space-y-3">
      {/* Mensajeros */}
      <div className="flex flex-wrap items-center gap-2">
        {shown.map(c => (
          <button key={c.nombre} type="button" onClick={() => setActive(c.nombre)}
            className={`px-4 py-2.5 font-sans text-sm font-semibold border-2 ${active === c.nombre ? "text-white" : "bg-white"}`}
            style={{ borderColor: c.color, background: active === c.nombre ? c.color : undefined, color: active === c.nombre ? "#fff" : c.color }}>
            Mensajero {c.nombre} · {routes[c.nombre]?.length ?? 0}
          </button>
        ))}
        {count < colors.length && (
          <button type="button" onClick={() => setCount(n => n + 1)} className="px-3 py-2.5 font-mono text-[10px] tracking-[0.15em] uppercase border border-black/20 bg-white">+ Mensajero</button>
        )}
        <button type="button" onClick={() => setRoutes(Object.fromEntries(current.map(r => [r.color, r.stops])))}
          className="ml-auto px-3 py-2.5 font-mono text-[10px] tracking-[0.15em] uppercase text-salvia-700 border border-salvia-700/40 bg-white">
          Empezar con el mapa actual
        </button>
        {totalStops > 0 && (
          <button type="button" onClick={() => setRoutes({})} className="px-3 py-2.5 font-mono text-[10px] tracking-[0.15em] uppercase text-ink-2 border border-black/15 bg-white">Vaciar</button>
        )}
      </div>

      {locating && (
        <div className="bg-amber-50 border border-amber-300 px-4 py-2.5 font-sans text-sm flex flex-wrap items-center justify-between gap-2">
          <span>Toca en el mapa dónde queda <b>{locating.name}</b> ({locating.address}).</span>
          <button type="button" onClick={() => setLocating(null)} className="font-mono text-[10px] tracking-[0.15em] uppercase underline">Cancelar</button>
        </div>
      )}
      {error && <p role="alert" className="font-sans text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">{error}</p>}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div ref={box} className="w-full h-[62vh] min-h-[380px] border border-black/10 z-0" />

        {/* Ruta del mensajero elegido */}
        <aside className="border border-black/10 bg-white lg:max-h-[62vh] overflow-y-auto">
          <div className="px-4 py-3 border-b border-black/10" style={{ borderTop: `4px solid ${hex(active)}` }}>
            <p className="font-serif text-lg font-semibold">Ruta del Mensajero {active}</p>
            {st && activeStops.length ? (
              <p className="font-sans text-[13px] text-ink-2 mt-0.5">
                {st.km.toFixed(0)} km · {dur(st.min)} por vuelta · {st.horario.length} {st.horario.length === 1 ? "vuelta" : "vueltas"} al día · {st.muestras} muestras/mes
                {st.horario.length > 0 && <span className="block">Salidas: {st.horario.map(v => hora(v.sale)).join(" · ")}</span>}
              </p>
            ) : (
              <p className="font-sans text-[13px] text-ink-2 mt-0.5">Toca clínicas en la lista o en el mapa: se agregan en ese orden.</p>
            )}
          </div>
          <ol className="divide-y divide-black/[0.06]">
            {activeStops.map((p, i) => (
              <li key={p.id} className="px-4 py-2 flex items-center gap-2.5">
                <span className="w-6 h-6 shrink-0 rounded-full text-white font-sans text-[11px] font-bold grid place-items-center" style={{ background: hex(active) }}>{i + 1}</span>
                <span className="flex-1 min-w-0 font-sans text-sm leading-tight">{p.name}<span className="block text-[11.5px] text-ink-2 truncate">{p.address}</span></span>
                <button type="button" aria-label="Subir" onClick={() => move(p.id, -1)} disabled={i === 0} className="w-7 h-7 border border-black/15 disabled:opacity-30">↑</button>
                <button type="button" aria-label="Bajar" onClick={() => move(p.id, 1)} disabled={i === activeStops.length - 1} className="w-7 h-7 border border-black/15 disabled:opacity-30">↓</button>
                <button type="button" aria-label="Quitar" onClick={() => remove(p.id)} className="w-7 h-7 border border-black/15 text-red-700">✕</button>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      {/* Todas las clínicas */}
      <section className="border border-black/10 bg-white">
        <div className="px-4 py-3 border-b border-black/10 flex flex-wrap items-center justify-between gap-2">
          <p className="font-sans text-sm font-semibold">Clínicas ({points.length}) <span className="font-normal text-ink-2">· ordenadas por muestras en 30 días</span></p>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar clínica o dirección…" aria-label="Buscar clínica"
            className="w-full sm:w-72 border border-black/20 bg-white px-3 py-2 text-sm font-sans focus:outline-2 focus:outline-salvia-700" />
        </div>
        <div className="max-h-[48vh] overflow-y-auto divide-y divide-black/[0.06]">
          {list.map(p => {
            const o = owner(p.id)
            const pos = o ? (routes[o.nombre] ?? []).indexOf(p.id) + 1 : 0
            return (
              <div key={p.id} className="px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex-1 min-w-[200px] font-sans text-sm leading-tight">
                  {p.name}{p.own && <span className="ml-1.5 font-mono text-[8px] tracking-[0.12em] uppercase text-azul-700">Propia</span>}
                  <span className="block text-[11.5px] text-ink-2">{p.address || "Sin dirección"}</span>
                </span>
                <span className="font-mono text-[11px] text-ink-2 w-20 text-right">{p.m} muestras</span>
                {p.lat == null ? (
                  <button type="button" onClick={() => setLocating(p)} className="px-3 py-1.5 font-mono text-[9px] tracking-[0.12em] uppercase border border-amber-500 text-amber-800 bg-amber-50">Sin ubicación · Ubicar</button>
                ) : o?.nombre === active ? (
                  <button type="button" onClick={() => remove(p.id)} className="px-3 py-1.5 font-mono text-[9px] tracking-[0.12em] uppercase text-white" style={{ background: o.color }}>#{pos} · Quitar</button>
                ) : o ? (
                  <button type="button" onClick={() => add(p.id)} className="px-3 py-1.5 font-mono text-[9px] tracking-[0.12em] uppercase border" style={{ borderColor: o.color, color: o.color }}>{o.nombre} #{pos} · Pasar a {active}</button>
                ) : (
                  <button type="button" onClick={() => add(p.id)} className="px-3 py-1.5 font-mono text-[9px] tracking-[0.12em] uppercase border border-salvia-700 text-salvia-700">+ Agregar a {active}</button>
                )}
              </div>
            )
          })}
          {list.length === 0 && <p className="px-4 py-6 font-sans text-sm text-ink-2">No hay clínicas con ese nombre.</p>}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={!totalStops} onClick={() => { setError(""); setConfirm(true) }}
          className="bg-salvia-700 text-bone font-mono text-[11px] tracking-[0.2em] uppercase px-7 py-3.5 hover:bg-salvia-800 disabled:opacity-50">
          Confirmar mapa
        </button>
        {unassignedWithSamples.length > 0 && totalStops > 0 && (
          <span className="font-sans text-[12.5px] text-ink-2">{unassignedWithSamples.length} clínicas con muestras quedan sin ruta fija: se recogen solo si llaman.</span>
        )}
      </div>

      {confirm && (
        <div className="fixed inset-0 z-[1000] bg-black/45 grid place-items-center px-4" onClick={e => { if (e.target === e.currentTarget) setConfirm(false) }}>
          <div className="bg-bone max-w-md w-full p-5 space-y-3">
            <p className="font-serif text-[22px] font-semibold">¿Quieres eliminar el mapa anterior y dejar este?</p>
            <ul className="font-sans text-sm space-y-1">
              {shown.filter(c => routes[c.nombre]?.length).map(c => (
                <li key={c.nombre}><b style={{ color: c.color }}>Mensajero {c.nombre}</b>: {routes[c.nombre].length} paradas · {stats[c.nombre]?.horario.length ?? 0} vueltas al día</li>
              ))}
            </ul>
            <p className="font-sans text-[13px] text-ink-2">Desde ahora el Plan de mensajeros, el PDF de instrucciones y el Día a día usan este mapa.</p>
            {error && <p className="font-sans text-sm text-red-700">{error}</p>}
            <div className="flex gap-2">
              <button type="button" disabled={pending}
                onClick={() => start(async () => {
                  setError("")
                  const rutas = shown.map(c => ({ color: c.nombre, stops: routes[c.nombre] ?? [] })).filter(r => r.stops.length)
                  const r = await saveManualRoutes(rutas).catch(() => ({ error: "No hubo conexión. Intenta de nuevo." }))
                  if (r.error) { setError(r.error); return }
                  router.push("/clientes/mensajeros?armado=1")
                })}
                className="flex-1 bg-salvia-700 text-bone font-mono text-[11px] tracking-[0.18em] uppercase py-3 disabled:opacity-60">
                {pending ? "Guardando…" : "Sí, dejar este"}
              </button>
              <button type="button" onClick={() => setConfirm(false)} className="flex-1 border border-black/20 font-mono text-[11px] tracking-[0.18em] uppercase py-3">No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
