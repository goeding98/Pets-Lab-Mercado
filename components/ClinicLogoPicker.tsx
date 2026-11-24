"use client"
// Logo de la clínica para sus reportes: se procesa en el navegador (recorta márgenes blancos, reduce a ≤600 px, PNG),
// se detectan sus colores (lib/brandColors.ts) y se muestra cómo queda el encabezado del reporte.
// - mode "create": va dentro de Nueva clínica; entrega el archivo y los colores con onChange (ClinicaForm los envía).
// - mode "edit": ficha de la clínica; guarda con su propio botón (actions/clinicLogo.ts).
import { useEffect, useRef, useState, useTransition } from "react"
import { contentBounds, detectBrandColors, reportPalette } from "@/lib/brandColors"
import { removeClinicLogo, updateClinicLogo } from "@/actions/clinicLogo"

export type LogoValue = { file: Blob; primary: string; accent: string }
type Processed = LogoValue & { url: string; detected: { primary: string; accent: string }; busyBackground: boolean }

const MAX_BYTES = 850 * 1024

async function processFile(file: File): Promise<Processed> {
  const src = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((ok, fail) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => fail(new Error("img"))
      i.src = src
    })
    // Análisis a ≤800 px: colores, fondo y márgenes
    const s = Math.min(1, 800 / Math.max(img.naturalWidth, img.naturalHeight))
    const aw = Math.max(1, Math.round(img.naturalWidth * s)), ah = Math.max(1, Math.round(img.naturalHeight * s))
    const a = document.createElement("canvas")
    a.width = aw; a.height = ah
    const actx = a.getContext("2d", { willReadFrequently: true })!
    actx.drawImage(img, 0, 0, aw, ah)
    const data = actx.getImageData(0, 0, aw, ah).data
    const det = detectBrandColors(data, aw, ah)
    const b = contentBounds(data, aw, ah)

    // Recorte en la imagen original y PNG de ≤600 px (más pequeño si pesa mucho)
    const sx = b.x / s, sy = b.y / s, sw = b.w / s, sh = b.h / s
    let max = 600, blob: Blob | null = null
    while (max >= 200) {
      const k = Math.min(1, max / Math.max(sw, sh))
      const c = document.createElement("canvas")
      c.width = Math.max(1, Math.round(sw * k)); c.height = Math.max(1, Math.round(sh * k))
      c.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height)
      blob = await new Promise<Blob | null>(ok => c.toBlob(ok, "image/png"))
      if (blob && blob.size <= MAX_BYTES) break
      max -= 150
    }
    if (!blob || blob.size > MAX_BYTES) throw new Error("big")
    return { file: blob, url: URL.createObjectURL(blob), primary: det.primary, accent: det.accent, detected: { primary: det.primary, accent: det.accent }, busyBackground: det.busyBackground }
  } finally {
    URL.revokeObjectURL(src)
  }
}

export default function ClinicLogoPicker({ mode, clinicId, clinicName, initial, onChange }: {
  mode: "create" | "edit"
  clinicId?: string
  clinicName?: string
  initial?: { hasLogo: boolean; primary: string | null; accent: string | null }
  onChange?: (v: LogoValue | null) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [proc, setProc] = useState<Processed | null>(null)
  const [primary, setPrimary] = useState(initial?.primary ?? "")
  const [accent, setAccent] = useState(initial?.accent ?? "")
  const [hasSaved, setHasSaved] = useState(!!initial?.hasLogo)
  const [saved, setSaved] = useState({ primary: initial?.primary ?? "", accent: initial?.accent ?? "" })
  const [version, setVersion] = useState(0)
  const [msg, setMsg] = useState<{ ok?: string; error?: string }>({})
  const [loading, setLoading] = useState(false)
  const [pending, start] = useTransition()

  const logoSrc = proc?.url ?? (hasSaved && clinicId ? `/api/clinics/${clinicId}/logo?v=${version}` : null)
  const pal = reportPalette(primary || null, accent || null)
  const dirty = !!proc || (hasSaved && (primary !== saved.primary || accent !== saved.accent))

  useEffect(() => () => { if (proc) URL.revokeObjectURL(proc.url) }, [proc])
  useEffect(() => {
    if (mode === "create") onChange?.(proc ? { file: proc.file, primary: pal.primary, accent: pal.accent } : null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proc, primary, accent])

  async function pick(file: File | undefined) {
    if (!file) return
    setMsg({})
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) { setMsg({ error: "Sube el logo en PNG o JPG." }); return }
    setLoading(true)
    try {
      const p = await processFile(file)
      setProc(p)
      setPrimary(p.primary)
      setAccent(p.accent)
    } catch {
      setMsg({ error: "No se pudo leer la imagen. Prueba con otro archivo PNG o JPG." })
    } finally {
      setLoading(false)
      if (input.current) input.current.value = ""
    }
  }

  function save() {
    if (!clinicId) return
    const fd = new FormData()
    if (proc) fd.set("logo", proc.file, "logo.png")
    fd.set("brandPrimary", pal.primary)
    fd.set("brandAccent", pal.accent)
    setMsg({})
    start(async () => {
      const r = await updateClinicLogo(clinicId, fd).catch(() => ({ error: "No se pudo guardar el logo." }))
      if (r.error) { setMsg({ error: r.error }); return }
      setProc(null)
      setHasSaved(true)
      setPrimary(pal.primary)
      setAccent(pal.accent)
      setSaved({ primary: pal.primary, accent: pal.accent })
      setVersion(v => v + 1)
      setMsg({ ok: "Listo: los reportes de esta clínica ya salen con su logo." })
    })
  }

  function remove() {
    if (!clinicId || !confirm("¿Quitar el logo? Los reportes de esta clínica vuelven a salir con el diseño de Pets & Lab.")) return
    start(async () => {
      const r = await removeClinicLogo(clinicId).catch(() => ({ error: "No se pudo quitar el logo." }))
      if (r.error) { setMsg({ error: r.error }); return }
      setProc(null); setHasSaved(false); setPrimary(""); setAccent(""); setSaved({ primary: "", accent: "" })
      setMsg({ ok: "Logo quitado." })
    })
  }

  function discard() {
    setProc(null)
    setPrimary(saved.primary)
    setAccent(saved.accent)
    setMsg({})
  }

  const btn = "font-mono text-[10px] tracking-[0.18em] uppercase px-4 py-2.5 transition-colors disabled:opacity-60"
  return (
    <div className="space-y-3">
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={e => pick(e.target.files?.[0])} />

      {!logoSrc ? (
        <div className="border border-dashed border-black/20 bg-white px-4 py-5 text-center">
          <p className="font-sans text-sm text-ink-2 mb-3">
            Con logo, los resultados de esta clínica salen con su marca y sus colores (Pets &amp; Lab aparece como aliado). Sin
            logo, salen con el diseño de Pets &amp; Lab.
          </p>
          <button type="button" onClick={() => input.current?.click()} disabled={loading} className={`${btn} border border-salvia-700 text-salvia-700 hover:bg-salvia-700 hover:text-bone`}>
            {loading ? "Procesando…" : "Subir logo"}
          </button>
          <p className="font-sans text-[11px] text-ink-2 mt-2">PNG o JPG. Mejor con fondo transparente o blanco.</p>
        </div>
      ) : (
        <>
          {/* Vista previa del encabezado del reporte */}
          <div className="border border-black/10 bg-white overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: `3px solid ${pal.accent}` }}>
              <div className="flex items-center min-w-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoSrc} alt="Logo de la clínica" className="h-14 w-auto max-w-[120px] object-contain" />
                <div className="ml-3 pl-3 border-l border-black/10 hidden sm:block">
                  <p className="font-sans text-[8px] font-bold tracking-[0.18em] uppercase text-[#3a4a3f] mb-1">Aliado estratégico en diagnóstico</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logos/pets-lab-salvia.png" alt="Pets & Lab" className="h-6 w-auto" />
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-sans text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: pal.primary }}>Reporte de laboratorio</p>
                <p className="font-sans text-[9px] text-ink-2 tracking-wider">N° 2026-00000</p>
              </div>
            </div>
            <div className="p-3 space-y-2">
              <div className="px-3 py-2 font-sans text-xs" style={{ background: pal.light, borderLeft: `3px solid ${pal.accent}` }}>
                <span className="text-ink-2 text-[9px] tracking-widest uppercase block">Clínica</span>
                <b>{clinicName || "Clínica"}</b>
              </div>
              <div className="flex justify-between px-3 py-1.5 font-sans text-xs text-white font-bold" style={{ background: pal.primary }}>
                Hemograma Completo
                <span className="font-normal tracking-widest text-[9px] uppercase" style={{ color: pal.onPrimaryMuted }}>Hematología</span>
              </div>
            </div>
          </div>

          {proc?.busyBackground && (
            <p className="font-sans text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-2">
              Este logo tiene fondo de color o con dibujos y se va a notar en el reporte. Si puedes, pídele a la clínica el
              archivo con fondo transparente o blanco.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-sm">
            <label className="flex items-center gap-2">
              <input type="color" value={pal.primary} onChange={e => setPrimary(e.target.value)} className="w-8 h-8 border border-black/15 bg-white p-0.5 cursor-pointer" />
              Color principal
            </label>
            <label className="flex items-center gap-2">
              <input type="color" value={pal.accent} onChange={e => setAccent(e.target.value)} className="w-8 h-8 border border-black/15 bg-white p-0.5 cursor-pointer" />
              Color de acento
            </label>
            {proc && (primary !== proc.detected.primary || accent !== proc.detected.accent) && (
              <button type="button" onClick={() => { setPrimary(proc.detected.primary); setAccent(proc.detected.accent) }} className="font-mono text-[9px] tracking-[0.15em] uppercase text-salvia-700 hover:underline">
                Volver a los del logo
              </button>
            )}
          </div>
          <p className="font-sans text-[11px] text-ink-2">
            Los colores salen del logo. El principal se oscurece solo si hace falta para que el texto blanco se lea.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {mode === "edit" && dirty && (
              <button type="button" onClick={save} disabled={pending} className={`${btn} bg-salvia-700 text-bone hover:bg-salvia-800`}>
                {pending ? "Guardando…" : "Guardar logo"}
              </button>
            )}
            <button type="button" onClick={() => input.current?.click()} disabled={loading || pending} className={`${btn} border border-salvia-700 text-salvia-700 hover:bg-salvia-700 hover:text-bone`}>
              {loading ? "Procesando…" : "Cambiar logo"}
            </button>
            {mode === "edit" && proc && hasSaved && (
              <button type="button" onClick={discard} className="font-mono text-[9px] tracking-[0.15em] uppercase text-ink-2 hover:underline">Descartar</button>
            )}
            {mode === "edit" && hasSaved && !proc && (
              <button type="button" onClick={remove} disabled={pending} className="font-mono text-[9px] tracking-[0.15em] uppercase text-red-700 hover:underline ml-auto">
                Quitar logo
              </button>
            )}
            {mode === "create" && (
              <button type="button" onClick={discard} className="font-mono text-[9px] tracking-[0.15em] uppercase text-ink-2 hover:underline">Quitar</button>
            )}
          </div>
        </>
      )}

      {msg.error && <p className="font-sans text-sm text-red-600">{msg.error}</p>}
      {msg.ok && <p className="font-sans text-sm text-salvia-700">{msg.ok}</p>}
    </div>
  )
}
