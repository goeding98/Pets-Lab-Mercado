"use client"
import { useEffect, useState } from "react"
import { partsShareUrl } from "@/actions/shareParts"
import WhatsAppButton from "./WhatsAppButton"

type WaProps = Omit<Parameters<typeof WhatsAppButton>[0], "shareUrl" | "what" | "small">

// Reporte por partes de un perfil (lib/reportParts.ts): elegir Hemograma, Química, Coprológico… y sacar el PDF o
// mandarlo por WhatsApp sin esperar a que esté todo el perfil. Sale lo GUARDADO (Guardar o Guardar borrador).
export default function PartsReport({ examId, parts, withData, wa }: {
  examId: string
  parts: string[]
  withData: string[] // partes con algo guardado
  wa: WaProps
}) {
  const [picked, setPicked] = useState<string[]>([])
  const [shareUrl, setShareUrl] = useState<string | null>(null)

  useEffect(() => {
    setShareUrl(null)
    if (picked.length === 0) return
    let live = true
    partsShareUrl(examId, picked.map(p => parts.indexOf(p))).then(u => { if (live) setShareUrl(u) }).catch(() => {})
    return () => { live = false }
  }, [examId, parts, picked])

  const toggle = (p: string) => setPicked(list => (list.includes(p) ? list.filter(x => x !== p) : parts.filter(x => x === p || list.includes(x))))
  const btn = "font-mono text-[9px] tracking-[0.18em] uppercase px-3 py-1.5 transition-colors"

  return (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5 mb-1.5 border border-black/10 bg-white px-3 py-2">
      <span className="font-mono text-[8px] tracking-[0.15em] uppercase text-ink-2">Enviar por partes:</span>
      {parts.map(p => {
        const has = withData.includes(p)
        return (
          <label key={p} className={`flex items-center gap-1.5 font-sans text-xs ${has ? "text-ink cursor-pointer" : "text-ink-2/60 cursor-not-allowed"}`} title={has ? undefined : "Sin resultados guardados: digita y da Guardar borrador"}>
            <input type="checkbox" disabled={!has} checked={picked.includes(p)} onChange={() => toggle(p)} />
            {p}
          </label>
        )
      })}
      {picked.length > 0 ? (
        <>
          <a href={`/api/pdf/exam/${examId}?parts=${encodeURIComponent(picked.join("|"))}`} target="_blank" className={`${btn} bg-ink text-bone hover:bg-ink/80`}>
            PDF →
          </a>
          {shareUrl
            ? <WhatsAppButton {...wa} small shareUrl={shareUrl} what={`el resultado de ${picked.join(" y ")}`} />
            : <span className={`${btn} border border-black/15 text-ink-2`}>WhatsApp…</span>}
        </>
      ) : (
        <span className="font-sans text-[11px] text-ink-2">Elige qué partes enviar</span>
      )}
    </div>
  )
}
