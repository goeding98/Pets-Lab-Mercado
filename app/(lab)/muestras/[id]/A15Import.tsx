"use client"
import { useEffect, useRef, useState } from "react"
import {
  A15_EVENT, cleanNumber, isTypeToken, matchTech, toPetslab,
  type A15EventDetail, type A15FillReport, type A15Tech,
} from "@/lib/a15"

// "Cargar desde el A15": se pegan o suben capturas de la ventana "Resultados muestra" del equipo de química,
// se leen en el navegador (OCR con tesseract.js, sin enviar la imagen a ningún lado), se revisan/editan en una
// tabla y "Pasar a los exámenes" llena los formularios pendientes de la muestra (lib/a15.ts: A15_EVENT).
// No guarda nada: el microbiólogo revisa y da Guardar en cada examen como siempre.

type Row = {
  tech: A15Tech
  device: string // valor como lo da el equipo
  unit: string
  value: string // en la unidad de Petslab (editable)
  sure: boolean // las lecturas del OCR coinciden
}
type Img = { id: number; url: string; name: string; status: "leyendo" | "listo" | "error"; sample?: string; count?: number }

type Tess = typeof import("tesseract.js")
type Worker = Awaited<ReturnType<Tess["createWorker"]>>
let workers: Promise<{ text: Worker; digits: Worker }> | null = null
function getWorkers() {
  if (!workers) {
    workers = (async () => {
      const { createWorker } = await import("tesseract.js")
      const [text, digits] = await Promise.all([createWorker("eng"), createWorker("eng")])
      await text.setParameters({ preserve_interword_spaces: "1" })
      // Segunda lectura solo de la celda del resultado, restringida a números (corrige "a1" → "41")
      await digits.setParameters({ tessedit_char_whitelist: "0123456789.,-", tessedit_pageseg_mode: "7" as never })
      return { text, digits }
    })()
    workers.catch(() => { workers = null })
  }
  return workers
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// La captura se agranda y se pasa a gris: el OCR lee mucho mejor los números así
function scaled(img: HTMLImageElement, s: number) {
  const c = document.createElement("canvas")
  c.width = img.naturalWidth * s
  c.height = img.naturalHeight * s
  const ctx = c.getContext("2d")!
  ctx.imageSmoothingQuality = "high"
  ctx.filter = "grayscale(1)"
  ctx.drawImage(img, 0, 0, c.width, c.height)
  return c
}

async function readScreenshot(file: Blob): Promise<{ rows: Row[]; sample?: string }> {
  const { text, digits } = await getWorkers()
  const img = await loadImage(file)
  const c2 = scaled(img, 2)
  const c3 = scaled(img, 3)
  const { data } = await text.recognize(c2)
  const rows: Row[] = []
  let sample: string | undefined
  for (const line of data.lines ?? []) {
    const words = line.words.filter(w => w.text.trim())
    const ti = words.findIndex((w, i) => i > 0 && isTypeToken(w.text))
    // Sin columna TIPO: el valor es la primera palabra numérica después del nombre
    const vi = ti > 0 ? ti + 1 : words.findIndex((w, i) => i > 0 && cleanNumber(w.text) !== null)
    if (vi <= 0 || !words[vi]) {
      // Código de la muestra (ej. PIKIHUERTAS26): una sola palabra antes de la tabla
      if (!sample && rows.length === 0 && words.length === 1 && /^[A-Z0-9_-]{4,}$/i.test(words[0].text) && !/^T[EÉ]CNICAS$/i.test(words[0].text)) sample = words[0].text
      continue
    }
    const nameWords = words.slice(0, ti > 0 ? ti : vi)
    const tech = matchTech(nameWords.map(w => w.text).join(" "))
    if (!tech) continue
    const b = words[vi].bbox
    const pad = 8
    const cell = async (canvas: HTMLCanvasElement, k: number) => {
      const r = await digits.recognize(canvas, {
        rectangle: { left: Math.max(0, (b.x0 - pad) * k), top: Math.max(0, (b.y0 - pad) * k), width: (b.x1 - b.x0 + 2 * pad) * k, height: (b.y1 - b.y0 + 2 * pad) * k },
      })
      return cleanNumber(r.data.text)
    }
    const reads = [cleanNumber(words[vi].text), await cell(c2, 1), await cell(c3, 1.5)]
    const valid = reads.filter((v): v is string => v !== null)
    if (valid.length === 0) continue
    const counts = new Map<string, number>()
    for (const v of valid) counts.set(v, (counts.get(v) ?? 0) + 1)
    // Gana la lectura más repetida; si empatan, la de solo números a escala x2
    const [top, n] = Array.from(counts.entries()).sort((a, z) => z[1] - a[1])[0]
    const device = n > 1 ? top : (reads[1] ?? valid[0])
    const unit = words[vi + 1]?.text ?? ""
    rows.push({ tech, device, unit, value: toPetslab(tech, device, unit), sure: valid.length === 3 && counts.size === 1 })
  }
  URL.revokeObjectURL(img.src)
  return { rows, sample }
}

let nextId = 1

export default function A15Import() {
  const [open, setOpen] = useState(false)
  const [images, setImages] = useState<Img[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [report, setReport] = useState<A15FillReport[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const queue = useRef(Promise.resolve())

  function addFiles(files: File[]) {
    const imgs = files.filter(f => f.type.startsWith("image/"))
    if (imgs.length === 0) return setError("Pega o elige una imagen (captura de pantalla).")
    setError(null)
    setReport(null)
    for (const f of imgs) {
      const id = nextId++
      setImages(list => [...list, { id, url: URL.createObjectURL(f), name: f.name || "captura", status: "leyendo" }])
      // Una imagen a la vez (los lectores del OCR son compartidos)
      queue.current = queue.current.then(async () => {
        try {
          const r = await readScreenshot(f)
          setRows(prev => {
            const out = [...prev]
            for (const row of r.rows) {
              const i = out.findIndex(o => o.tech.name === row.tech.name)
              if (i < 0) out.push(row)
              // La misma técnica en dos fotos con valores distintos: queda el último y se marca para revisar
              else out[i] = { ...row, sure: row.sure && out[i].device === row.device }
            }
            return out
          })
          setImages(list => list.map(m => (m.id === id ? { ...m, status: "listo", sample: r.sample, count: r.rows.length } : m)))
        } catch (e) {
          console.error(e)
          setImages(list => list.map(m => (m.id === id ? { ...m, status: "error" } : m)))
        }
      })
    }
  }

  // Ctrl+V con la ventana abierta pega la captura
  useEffect(() => {
    if (!open) return
    const onPaste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? [])
      if (files.some(f => f.type.startsWith("image/"))) {
        e.preventDefault()
        addFiles(files)
      }
    }
    window.addEventListener("paste", onPaste)
    return () => window.removeEventListener("paste", onPaste)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function fill() {
    const values: Record<string, string> = {}
    for (const r of rows) if (r.tech.key && cleanNumber(r.value) !== null) values[r.tech.key] = cleanNumber(r.value)!
    const detail: A15EventDetail = { values, report: [] }
    window.dispatchEvent(new CustomEvent(A15_EVENT, { detail }))
    setReport(detail.report)
  }

  function clear() {
    images.forEach(m => URL.revokeObjectURL(m.url))
    setImages([])
    setRows([])
    setReport(null)
    setError(null)
  }

  const reading = images.some(m => m.status === "leyendo")
  const samples = Array.from(new Set(images.map(m => m.sample).filter(Boolean)))
  const doneFor = (key: string | null) => (report && key ? report.filter(r => r.key === key) : [])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border border-salvia-700 text-salvia-700 font-mono text-[9px] tracking-[0.18em] uppercase px-4 py-2 hover:bg-salvia-700 hover:text-bone transition-colors"
      >
        Cargar resultados del A15
      </button>
    )
  }

  return (
    <div className="border border-salvia-700/40 bg-white">
      <div className="bg-salvia-50 border-b border-black/10 px-5 py-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-serif text-[17px] font-medium tracking-[-0.01em]">Resultados del A15</p>
          <p className="font-sans text-xs text-ink-2 mt-0.5">
            Pega (Ctrl+V) o sube las capturas de &quot;Resultados muestra&quot;. Si la lista no cabe en una, toma varias bajando la barra.
          </p>
        </div>
        <button type="button" onClick={() => { clear(); setOpen(false) }} className="font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-1 border border-black/20 hover:bg-black/5">
          Cerrar
        </button>
      </div>

      <div className="px-5 py-4 space-y-4">
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); addFiles(Array.from(e.dataTransfer.files)) }}
          className="border border-dashed border-black/25 bg-bone/50 px-4 py-5 text-center"
        >
          <p className="font-sans text-sm text-ink">Pega aquí la captura con <strong>Ctrl+V</strong>, arrástrala, o</p>
          <button type="button" onClick={() => fileRef.current?.click()} className="mt-2 bg-ink text-bone font-mono text-[9px] tracking-[0.18em] uppercase px-4 py-2 hover:bg-ink/80">
            Elegir imágenes
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = "" }} />
        </div>
        {error && <p className="font-sans text-xs text-red-700">{error}</p>}

        {images.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {images.map(m => (
              <div key={m.id} className="w-36">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.url} alt={m.name} className="w-36 h-24 object-cover object-left-top border border-black/10" />
                <p className="font-mono text-[8px] tracking-[0.12em] uppercase mt-1 text-ink-2">
                  {m.status === "leyendo" ? "Leyendo…" : m.status === "error" ? <span className="text-red-700">No se pudo leer</span> : `${m.count} valores`}
                </p>
              </div>
            ))}
          </div>
        )}
        {reading && <p className="font-sans text-xs text-ink-2">Leyendo la imagen… la primera vez tarda un poco más (descarga el lector).</p>}
        {samples.length > 0 && (
          <p className="font-sans text-xs text-ink">
            Muestra en el equipo: <strong>{samples.join(", ")}</strong>
            {samples.length > 1 && <span className="text-red-700"> — ¡las fotos son de muestras distintas! Revisa.</span>}
          </p>
        )}

        {rows.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left">
                    {["Técnica A15", "Equipo", "Parámetro Petslab", "Valor", ""].map(h => (
                      <th key={h} className="font-mono text-[8px] tracking-[0.15em] text-salvia-700 uppercase pb-2 pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const done = doneFor(r.tech.key)
                    return (
                      <tr key={r.tech.name} className={`border-t border-black/[0.05] ${r.tech.key ? "" : "opacity-50"}`}>
                        <td className="py-1.5 pr-3 font-mono text-[10px]">{r.tech.name}</td>
                        <td className="py-1.5 pr-3 text-ink-2 whitespace-nowrap">{r.device} {r.unit}</td>
                        <td className="py-1.5 pr-3">{r.tech.key ? r.tech.label : `${r.tech.label} (no se usa)`}</td>
                        <td className="py-1.5 pr-3">
                          {r.tech.key && (
                            <input
                              value={r.value}
                              onChange={e => setRows(list => list.map((x, j) => (j === i ? { ...x, value: e.target.value, sure: true } : x)))}
                              title={r.sure ? undefined : "Revisa este valor contra la pantalla del equipo"}
                              className={`w-24 border px-2 py-1 font-sans text-xs ${r.sure ? "border-black/20 bg-white" : "border-amber-500 bg-amber-50"}`}
                            />
                          )}
                          {r.tech.gPerL && r.value !== r.device && <span className="ml-2 text-ink-2">g/dL</span>}
                        </td>
                        <td className="py-1.5 font-sans text-[11px] text-ink-2">
                          {!r.sure && r.tech.key && <span className="text-amber-700">Revisar · </span>}
                          {report && r.tech.key && (done.length === 0
                            ? "No está en esta muestra"
                            : done.map(d => `${d.status === "llenado" ? "✓" : d.status === "calculado" ? "Se calcula en" : "Completado (pulsa Editar):"} ${d.exam}`).join(" · "))}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={fill}
                disabled={reading}
                className="bg-salvia-700 text-bone font-mono text-[9px] tracking-[0.18em] uppercase px-4 py-2 hover:bg-salvia-700/90 disabled:opacity-50"
              >
                Pasar a los exámenes
              </button>
              <button type="button" onClick={clear} className="font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-2 border border-black/20 hover:bg-black/5">
                Empezar de nuevo
              </button>
              {report && (
                <p className="font-sans text-xs text-ink">
                  Listo: {report.filter(r => r.status === "llenado").length} valores pasados. Revisa cada examen y dale <strong>Guardar</strong> (o Guardar borrador).
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
