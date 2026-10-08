"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { unsavedCount } from "@/lib/unsavedWork"

// Barra superior del LIMS con las muestras abiertas, como pestañas: para trabajar varias a la vez y
// saltar entre pacientes. Se guarda en este navegador (localStorage). Si hay cambios sin guardar en la
// muestra actual, avisa antes de salir (pestañas, menú o cerrar la página).

type OpenSample = { id: string; orderNumber: string; patientName: string }
const KEY = "petslab:openSamples"
const EVENT = "petslab:openSamples"
const MAX = 12

function read(): OpenSample[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]")
    return Array.isArray(v) ? v.filter(x => x && typeof x.id === "string").slice(0, MAX) : []
  } catch {
    return []
  }
}
function write(list: OpenSample[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX))) } catch { /* sin almacenamiento */ }
  window.dispatchEvent(new CustomEvent(EVENT))
}

const LEAVE_MSG = "Hay resultados sin guardar en esta muestra. ¿Salir sin guardar? (Puedes usar Guardar borrador.)"

// Quita una muestra de la barra (ej. al eliminarla)
export function removeOpenSample(id: string) {
  write(read().filter(s => s.id !== id))
}

// Lo pinta la página de la muestra: la agrega (o actualiza) en la barra
export function TrackOpenSample(sample: OpenSample) {
  useEffect(() => {
    const list = read()
    const i = list.findIndex(s => s.id === sample.id)
    if (i >= 0) list[i] = sample
    else list.push(sample)
    // Si se pasa del máximo, sale la más antigua que no sea esta
    while (list.length > MAX) list.splice(list.findIndex(s => s.id !== sample.id), 1)
    write(list)
  }, [sample.id, sample.orderNumber, sample.patientName])
  return null
}

export default function OpenSamplesBar() {
  const path = usePathname()
  const router = useRouter()
  const [list, setList] = useState<OpenSample[]>([])
  const barRef = useRef<HTMLDivElement>(null)

  // Alto de la barra: las pestañas de exámenes se pegan justo debajo (--open-bar-h)
  useEffect(() => {
    const set = () => document.documentElement.style.setProperty("--open-bar-h", `${barRef.current?.offsetHeight ?? 0}px`)
    set()
    const ro = barRef.current ? new ResizeObserver(set) : null
    if (barRef.current) ro!.observe(barRef.current)
    return () => { ro?.disconnect(); document.documentElement.style.setProperty("--open-bar-h", "0px") }
  }, [list.length])

  useEffect(() => {
    const sync = () => setList(read())
    sync()
    window.addEventListener(EVENT, sync)
    window.addEventListener("storage", sync)
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync) }
  }, [])

  // Aviso de cambios sin guardar: cerrar/recargar la página y cualquier enlace interno (menú, pestañas)
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (unsavedCount() > 0) { e.preventDefault(); e.returnValue = "" }
    }
    const onClick = (e: MouseEvent) => {
      if (unsavedCount() === 0 || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return
      const a = (e.target as HTMLElement).closest("a")
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return
      const url = new URL(a.href, location.href)
      if (url.origin !== location.origin || url.pathname === location.pathname) return
      if (!confirm(LEAVE_MSG)) { e.preventDefault(); e.stopPropagation() }
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    document.addEventListener("click", onClick, true)
    return () => { window.removeEventListener("beforeunload", onBeforeUnload); document.removeEventListener("click", onClick, true) }
  }, [])

  if (list.length === 0) return null
  const activeId = path.match(/^\/muestras\/([^/]+)$/)?.[1]

  function close(id: string) {
    if (id === activeId && unsavedCount() > 0 && !confirm(LEAVE_MSG)) return
    const next = list.filter(s => s.id !== id)
    write(next)
    if (id === activeId) router.push(next.length ? `/muestras/${next[next.length - 1].id}` : "/muestras")
  }

  return (
    <div ref={barRef} className="sticky top-0 z-30 bg-salvia-50/95 backdrop-blur border-b border-black/10">
      <div className="flex items-stretch overflow-x-auto">
        <span className="shrink-0 self-center pl-4 pr-2 font-mono text-[8px] tracking-[0.2em] uppercase text-ink-2">Abiertas</span>
        {list.map(s => {
          const active = s.id === activeId
          return (
            <div key={s.id} className={`group shrink-0 flex items-center border-r border-black/[0.08] ${active ? "bg-bone border-b-2 border-b-salvia-700" : "hover:bg-white/60"}`}>
              <Link href={`/muestras/${s.id}`} className="pl-3 pr-1 py-2 max-w-[200px]">
                <span className={`block font-sans text-xs truncate ${active ? "text-ink font-medium" : "text-ink-2"}`}>{s.patientName}</span>
                <span className="block font-mono text-[8px] tracking-[0.12em] text-salvia-700">{s.orderNumber}</span>
              </Link>
              <button
                type="button"
                onClick={() => close(s.id)}
                title="Cerrar pestaña"
                className="px-2 py-2 text-ink-2 hover:text-red-700 text-sm leading-none"
              >
                ×
              </button>
            </div>
          )
        })}
        {list.length > 1 && (
          <button
            type="button"
            onClick={() => { if (!activeId || unsavedCount() === 0 || confirm(LEAVE_MSG)) { write(list.filter(s => s.id === activeId)) } }}
            className="shrink-0 ml-auto px-3 font-mono text-[8px] tracking-[0.15em] uppercase text-ink-2 hover:text-ink"
            title="Deja solo la muestra actual"
          >
            Cerrar las demás
          </button>
        )}
      </div>
    </div>
  )
}
