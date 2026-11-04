"use client"
import { useEffect, useRef, useState } from "react"
import "leaflet/dist/leaflet.css"
import { setBranchLocation } from "@/actions/geo"

export type MapPoint = {
  id: string
  clinicId: string
  clinic: string
  branch: string
  address: string
  lat: number | null
  lng: number | null
  manual: boolean
  own: boolean // Pets & Pets
  orders: number
  recent: number // últimos 90 días
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`)
const color = (p: MapPoint) => (p.own ? "#c9772b" : p.recent > 0 ? "#2f5d50" : "#9aa79f")
// Tamaño según muestras enviadas (raíz: Pets & Pets con cientos no tapa a los demás)
const size = (p: MapPoint) => Math.round(14 + Math.min(26, Math.sqrt(p.orders) * 2.2))

// Mapa con Leaflet + OpenStreetMap. Se carga solo en el navegador (Leaflet usa window).
export default function ClientsMap({ points, canEdit }: { points: MapPoint[]; canEdit: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let map: import("leaflet").Map | null = null
    let cancelled = false
    ;(async () => {
      const L = (await import("leaflet")).default
      if (cancelled || !box.current) return
      map = L.map(box.current, { scrollWheelZoom: true })
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)

      const markers = points.map(p => {
        const s = size(p)
        const icon = L.divIcon({
          className: "",
          iconSize: [s, s],
          iconAnchor: [s / 2, s / 2],
          html: `<div style="width:${s}px;height:${s}px;border-radius:50%;background:${color(p)};opacity:.85;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
        })
        const m = L.marker([p.lat!, p.lng!], { icon, draggable: canEdit, title: `${p.clinic} · ${p.branch}` }).addTo(map!)
        m.bindPopup(
          `<div style="font-family:system-ui,sans-serif;font-size:12px;line-height:1.45">` +
            `<strong style="font-size:13px">${esc(p.clinic)}</strong><br>${esc(p.branch)} · ${esc(p.address)}<br>` +
            `${p.orders} muestras en total · ${p.recent} en 90 días` +
            `${p.manual ? "<br><em>Ubicada a mano</em>" : ""}` +
            `<br><a href="/clientes/${p.clinicId}">Ver cliente →</a></div>`,
        )
        m.on("dragend", async () => {
          const ll = m.getLatLng()
          setError("")
          const r = await setBranchLocation(p.id, ll.lat, ll.lng).catch(() => ({ error: "No se pudo guardar la ubicación." }))
          if (r.error) setError(r.error)
        })
        return m
      })

      if (markers.length) map.fitBounds(L.featureGroup(markers).getBounds().pad(0.15), { maxZoom: 15 })
      else map.setView([3.4372, -76.5225], 12) // Cali
    })().catch(() => setError("No se pudo cargar el mapa."))
    return () => {
      cancelled = true
      map?.remove()
    }
  }, [points, canEdit])

  return (
    <>
      {error && <p className="font-sans text-xs text-red-700 mb-2">{error}</p>}
      <div ref={box} className="w-full h-[70vh] min-h-[420px] border border-black/10 z-0" />
    </>
  )
}
