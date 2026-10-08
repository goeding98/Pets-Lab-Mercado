"use client"
import { Children, useEffect, useState } from "react"
import { UNSAVED_EVENT, isUnsaved } from "@/lib/unsavedWork"

// Pestañas de los exámenes de una muestra: una barra horizontal, un examen por pestaña. Todos los
// formularios siguen montados (solo se ocultan), así lo digitado no se pierde al cambiar de pestaña.
export type ExamTab = { id: string; name: string; status: string; hasDraft: boolean }
const ALL = "__todos__"

export default function ExamTabs({ orderId, tabs, children }: { orderId: string; tabs: ExamTab[]; children: React.ReactNode }) {
  const storeKey = `petslab:examTab:${orderId}`
  const firstPending = tabs.find(t => t.status !== "COMPLETADO")?.id ?? tabs[0]?.id ?? ALL
  const [active, setActive] = useState<string>(firstPending)
  const [, force] = useState(0)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storeKey)
      if (saved && (saved === ALL || tabs.some(t => t.id === saved))) setActive(saved)
    } catch { /* sin almacenamiento */ }
    const rerender = () => force(n => n + 1)
    window.addEventListener(UNSAVED_EVENT, rerender)
    return () => window.removeEventListener(UNSAVED_EVENT, rerender)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeKey])

  function select(id: string) {
    setActive(id)
    try { sessionStorage.setItem(storeKey, id) } catch { /* sin almacenamiento */ }
  }

  const items = Children.toArray(children)
  if (tabs.length <= 1) return <>{items}</>
  const current = tabs.some(t => t.id === active) || active === ALL ? active : firstPending

  const tabClass = (on: boolean) =>
    `shrink-0 flex items-center gap-2 px-3.5 py-2.5 border-b-2 font-sans text-xs whitespace-nowrap transition-colors ${
      on ? "border-salvia-700 text-ink font-medium bg-white" : "border-transparent text-ink-2 hover:text-ink hover:bg-white/60"
    }`

  return (
    <>
      <div style={{ top: "var(--open-bar-h, 0px)" }} className="sticky z-20 bg-bone/95 backdrop-blur border-b border-black/10">
        <div className="flex overflow-x-auto">
          {tabs.map(t => {
            const dirty = isUnsaved(t.id)
            const icon = t.status === "COMPLETADO"
              ? <span className="text-salvia-700" title="Completado">✓</span>
              : t.hasDraft
                ? <span className="text-amber-600" title="Borrador guardado">◐</span>
                : <span className="text-ink-2" title="Pendiente">○</span>
            return (
              <button key={t.id} type="button" onClick={() => select(t.id)} className={tabClass(current === t.id)} title={t.name}>
                {icon}
                <span className="max-w-[220px] truncate">{t.name}</span>
                {dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" title="Cambios sin guardar" />}
              </button>
            )
          })}
          <button type="button" onClick={() => select(ALL)} className={tabClass(current === ALL)}>
            Ver todos ({tabs.length})
          </button>
        </div>
      </div>
      {items.map((child, i) => (
        <div key={tabs[i]?.id ?? i} hidden={!(current === ALL || current === tabs[i]?.id)}>
          {child}
        </div>
      ))}
    </>
  )
}
