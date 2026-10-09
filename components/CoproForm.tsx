"use client"
import { Fragment, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CANTIDAD, COLOR, CONSISTENCIA, CRUCES, MICROBIOTA, NOTA_FIJA, PARASITOS_FLOTACION, PRESENCIA, PROTOZOOS,
  parseMarkup, stripMarkup, type CoproData,
} from "@/lib/coprologico"
import { uploadExamPhoto } from "@/lib/imageCompress"

// Formulario del Coprológico (resultado estructurado, ver lib/coprologico.ts): macroscópico + foto,
// tabla "Examen microscópico", técnica y observaciones. Lo pinta ExamResultForm en lugar de la tabla
// de campos cuando la sección es "Coprológico" o "Coproscópico" (este agrega su tabla en `extra`).

export const input = "border border-black/20 bg-white px-2 py-1.5 text-xs font-sans w-full focus:outline-salvia-700 disabled:bg-black/5 disabled:cursor-default"
export const label = "block font-mono text-[8px] tracking-[0.15em] text-salvia-700 uppercase mb-1"
export const heading = "font-mono text-[8px] tracking-[0.2em] text-ink-2 uppercase mb-3 border-b border-black/[0.06] pb-1"
const chip = "border border-black/15 bg-white px-2 py-0.5 font-mono text-[10px] text-ink hover:border-salvia-700 hover:text-salvia-700 disabled:opacity-40"

// Texto con **negrita** y *cursiva*
export function Markup({ text }: { text: string }) {
  return (
    <>
      {parseMarkup(text).map((s, i) =>
        s.bold ? <strong key={i}>{s.text}</strong> : s.italic ? <em key={i}>{s.text}</em> : <Fragment key={i}>{s.text}</Fragment>,
      )}
    </>
  )
}

export function Select({ value, options, onChange, disabled, placeholder = "Seleccionar…" }: {
  value: string; options: string[]; onChange: (v: string) => void; disabled: boolean; placeholder?: string
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className={input}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  )
}

// Opciones sugeridas + "Escribir otro…" para digitar un valor libre (un valor que no está en la
// lista se muestra directo como texto). "Lista" vuelve a las opciones.
const OTRO = "__otro__"
export function FreeSelect({ value, options, onChange, disabled, placeholder = "Seleccionar…", className = "w-full" }: {
  value: string; options: string[]; onChange: (v: string) => void; disabled: boolean; placeholder?: string; className?: string
}) {
  const [typing, setTyping] = useState(false)
  if (typing || (value !== "" && !options.includes(value))) {
    return (
      <div className={`flex gap-1.5 items-center ${className}`}>
        <input autoFocus={typing} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} placeholder="Escribir…" className={`${input} min-w-0`} />
        {!disabled && (
          <button type="button" title="Volver a las opciones" onClick={() => { setTyping(false); onChange("") }}
            className="font-mono text-[8px] tracking-[0.12em] uppercase text-salvia-700 hover:underline shrink-0">
            Lista
          </button>
        )}
      </div>
    )
  }
  return (
    <select
      value={value}
      onChange={e => { if (e.target.value === OTRO) { setTyping(true); onChange("") } else onChange(e.target.value) }}
      disabled={disabled}
      className={`${input} ${className}`}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o}>{o}</option>)}
      <option value={OTRO}>Escribir otro…</option>
    </select>
  )
}

function MacroPhoto({ examId, photo, locked, role }: { examId: string; photo: { id: string } | null; locked: boolean; role: string }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function upload(file: File) {
    setBusy(true)
    try {
      await uploadExamPhoto(examId, file, role)
      router.refresh()
    } catch {
      alert("No se pudo subir la foto. Intenta de nuevo.")
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function remove() {
    if (!photo || !confirm("¿Quitar la foto de la muestra?")) return
    setBusy(true)
    const res = await fetch(`/api/photos/${photo.id}`, { method: "DELETE" })
    if (!res.ok) alert("No se pudo quitar la foto.")
    setBusy(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <span className={label}>Foto de la muestra</span>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/photos/${photo.id}`} alt="Muestra" className="w-28 h-28 rounded-full object-cover border border-black/10" />
      ) : (
        <div className="w-28 h-28 rounded-full border border-dashed border-black/20 flex items-center justify-center text-center font-mono text-[8px] tracking-[0.12em] uppercase text-ink-2 px-3">
          Sin foto
        </div>
      )}
      {!locked && (
        <>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
          <div className="flex gap-3">
            <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className="font-mono text-[8px] tracking-[0.15em] uppercase text-salvia-700 hover:underline disabled:opacity-50">
              {busy ? "Subiendo…" : photo ? "Cambiar" : "Subir foto"}
            </button>
            {photo && (
              <button type="button" disabled={busy} onClick={remove} className="font-mono text-[8px] tracking-[0.15em] uppercase text-red-600 hover:underline disabled:opacity-50">
                Quitar
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

type Findings = { ninguno: boolean; items: { hallazgo: string; cantidad: string }[] }
type HpgFindings = { ninguno: boolean; items: { parasito: string; hpg: string }[] }

// "No se observan" o lista de hallazgos con cantidad (+ a +++). Protozoarios.
export function FindingsList({ value, onChange, locked, noneLabel = "No se observan" }: {
  value: Findings; onChange: (v: Findings) => void; locked: boolean; noneLabel?: string
}) {
  const setItem = (i: number, patch: Partial<Findings["items"][number]>) =>
    onChange({ ...value, items: value.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
  return (
    <>
      <label className="flex items-center gap-2 font-sans text-xs text-ink mb-2">
        <input type="checkbox" checked={value.ninguno} disabled={locked} onChange={e => onChange({ ...value, ninguno: e.target.checked })} className="accent-salvia-700" />
        {noneLabel}
      </label>
      {!value.ninguno && (
        <div className="space-y-2">
          {value.items.map((it, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-center">
              <input list="copro-protozoos" value={it.hallazgo} onChange={e => setItem(i, { hallazgo: e.target.value })} disabled={locked}
                placeholder="Hallazgo (ej. *Giardia sp.* (quistes))" className={`${input} flex-1 min-w-[200px]`} />
              <select value={it.cantidad} onChange={e => setItem(i, { cantidad: e.target.value })} disabled={locked} className={`${input} w-24`}>
                <option value="">Cant.</option>
                {CANTIDAD.map(c => <option key={c}>{c}</option>)}
              </select>
              {!locked && (
                <button type="button" onClick={() => onChange({ ...value, items: value.items.filter((_, j) => j !== i) })} className="font-mono text-[9px] uppercase text-red-600">✕</button>
              )}
            </div>
          ))}
          <datalist id="copro-protozoos">{PROTOZOOS.map(p => <option key={p} value={p}>{stripMarkup(p)}</option>)}</datalist>
          {!locked && (
            <button type="button" onClick={() => onChange({ ...value, items: [...value.items, { hallazgo: "", cantidad: "" }] })} className={chip}>
              + Agregar hallazgo
            </button>
          )}
        </div>
      )}
    </>
  )
}

// "No se observan" o lista de parásitos (en cursiva) + HPG. Técnica de flotación.
export function HpgList({ value, onChange, locked, noneLabel = "No se observan" }: {
  value: HpgFindings; onChange: (v: HpgFindings) => void; locked: boolean; noneLabel?: string
}) {
  const setItem = (i: number, patch: Partial<HpgFindings["items"][number]>) =>
    onChange({ ...value, items: value.items.map((x, j) => (j === i ? { ...x, ...patch } : x)) })
  return (
    <>
      <label className="flex items-center gap-2 font-sans text-xs text-ink mb-2">
        <input type="checkbox" checked={value.ninguno} disabled={locked} onChange={e => onChange({ ...value, ninguno: e.target.checked })} className="accent-salvia-700" />
        {noneLabel}
      </label>
      {!value.ninguno && (
        <div className="space-y-2">
          {value.items.map((it, i) => (
            <div key={i} className="flex flex-wrap gap-2 items-center">
              <input list="copro-parasitos" value={it.parasito} onChange={e => setItem(i, { parasito: e.target.value })} disabled={locked}
                placeholder="Parásito (ej. Toxocara canis)" className={`${input} flex-1 min-w-[200px] italic`} />
              <input value={it.hpg} onChange={e => setItem(i, { hpg: e.target.value })} disabled={locked} inputMode="numeric" placeholder="HPG" className={`${input} w-28`} />
              {!locked && (
                <button type="button" onClick={() => onChange({ ...value, items: value.items.filter((_, j) => j !== i) })} className="font-mono text-[9px] uppercase text-red-600">✕</button>
              )}
            </div>
          ))}
          <datalist id="copro-parasitos">{PARASITOS_FLOTACION.map(p => <option key={p} value={p} />)}</datalist>
          <p className="font-sans text-[10px] text-ink-2">HPG = huevos por gramo de materia fecal.</p>
          {!locked && (
            <button type="button" onClick={() => onChange({ ...value, items: [...value.items, { parasito: "", hpg: "" }] })} className={chip}>
              + Agregar parásito
            </button>
          )}
        </div>
      )}
    </>
  )
}

// Celda de las tablas de 2 columnas (Examen microscópico, Coproscópico)
export function Cell({ title, children, wide = false }: { title: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`p-3 min-h-[72px] ${wide ? "sm:col-span-2" : ""}`}>
      <span className={label}>{title}</span>
      {children}
    </div>
  )
}
export const grid = "grid grid-cols-1 sm:grid-cols-2 border border-black/10 divide-y divide-black/[0.06] sm:divide-y-0 bg-white [&>*]:border-black/[0.06] sm:[&>*:nth-child(odd)]:border-r sm:[&>*:nth-child(n+3)]:border-t"

export default function CoproForm({
  value, onChange, locked, examId, photo, extra, photoRole = "COPRO_MACRO", askDate = false,
}: {
  value: CoproData
  onChange: (v: CoproData) => void
  locked: boolean
  examId: string
  photo: { id: string } | null
  extra?: React.ReactNode // tabla adicional después del Examen microscópico (Coproscópico)
  photoRole?: string // foto de la muestra de este bloque (Coprológico Seriado: "COPRO_MACRO_2", "_3"…)
  askDate?: boolean // pedir la fecha de la muestra (siempre visible en el Seriado)
}) {
  const set = <K extends keyof CoproData>(k: K, v: CoproData[K]) => onChange({ ...value, [k]: v })

  return (
    <div className="space-y-6">
      {/* Fecha de la muestra (Coprológico Seriado: cada muestra es de un día distinto) */}
      {(askDate || value.fecha) && (
        <div className="flex flex-wrap items-center gap-2 bg-salvia-50/60 border border-black/[0.06] px-3 py-2">
          <span className={`${label} mb-0`}>Fecha de la muestra</span>
          <input type="date" value={value.fecha} onChange={e => set("fecha", e.target.value)} disabled={locked} className={`${input} w-44`} />
        </div>
      )}

      {/* Análisis macroscópico */}
      <div>
        <p className={heading}>Análisis macroscópico</p>
        <div className="flex flex-col sm:flex-row gap-5">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <span className={label}>Consistencia</span>
              <Select value={value.consistencia} options={CONSISTENCIA} onChange={v => set("consistencia", v)} disabled={locked} />
            </div>
            <div>
              <span className={label}>Color</span>
              <Select value={value.color} options={COLOR} onChange={v => set("color", v)} disabled={locked} />
              {value.color === "Otro" && (
                <input value={value.colorOtro} onChange={e => set("colorOtro", e.target.value)} disabled={locked} placeholder="¿Cuál?" className={`${input} mt-1.5`} />
              )}
            </div>
            <div>
              <span className={label}>Sangre macroscópica</span>
              <Select value={value.sangre} options={PRESENCIA} onChange={v => set("sangre", v)} disabled={locked} />
            </div>
            <div>
              <span className={label}>Moco</span>
              <Select value={value.moco} options={PRESENCIA} onChange={v => set("moco", v)} disabled={locked} />
            </div>
            <div className="sm:col-span-2">
              <span className={label}>Parásitos adultos</span>
              <input value={value.parasitosAdultos} onChange={e => set("parasitosAdultos", e.target.value)} disabled={locked} className={input} />
            </div>
            <div className="sm:col-span-2">
              <span className={label}>Otros (opcional; si queda vacío no sale en el PDF)</span>
              <input value={value.otros} onChange={e => set("otros", e.target.value)} disabled={locked} className={input} />
            </div>
          </div>
          <MacroPhoto examId={examId} photo={photo} locked={locked} role={photoRole} />
        </div>
      </div>

      {/* Examen microscópico */}
      <div>
        <p className={heading}>Examen microscópico</p>
        <div className={grid}>
          <Cell title="Microbiota">
            <Select value={value.microbiota} options={MICROBIOTA} onChange={v => set("microbiota", v)} disabled={locked} />
          </Cell>
          <Cell title="Glóbulos rojos">
            <Select value={value.globulosRojos} options={CRUCES} onChange={v => set("globulosRojos", v)} disabled={locked} />
          </Cell>
          <Cell title="Restos alimenticios">
            <Select value={value.restos} options={CRUCES} onChange={v => set("restos", v)} disabled={locked} />
          </Cell>
          <Cell title="Leucocitos">
            <input value={value.leucocitos} onChange={e => set("leucocitos", e.target.value)} disabled={locked} className={input} />
          </Cell>
          <Cell title="Levaduras">
            <Select value={value.levaduras} options={CRUCES} onChange={v => set("levaduras", v)} disabled={locked} />
          </Cell>
          <Cell title="Protozoarios">
            <FindingsList value={value.protozoos} onChange={v => set("protozoos", v)} locked={locked} />
          </Cell>
          <Cell title="Otros">
            <input
              value={value.microOtros}
              onChange={e => set("microOtros", e.target.value)}
              disabled={locked}
              placeholder="Ej. Estructuras compatibles con *Clostridium sp.* +"
              className={input}
            />
            <p className="font-sans text-[10px] text-ink-2 mt-1">Nombres científicos entre asteriscos para cursiva: *Clostridium sp.*</p>
            {value.microOtros.includes("*") && <p className="font-sans text-xs text-ink mt-1"><Markup text={value.microOtros} /></p>}
          </Cell>
          <Cell title="Técnica de flotación">
            <HpgList value={value.flotacion} onChange={v => set("flotacion", v)} locked={locked} noneLabel="No se observan huevos" />
          </Cell>
        </div>
      </div>

      {extra}

      {/* Pie técnico */}
      <div>
        <p className={heading}>Técnica</p>
        <input value={value.tecnica} onChange={e => set("tecnica", e.target.value)} disabled={locked} className={input} />
        <p className="font-sans text-[11px] text-ink-2 italic mt-1.5">Nota: {NOTA_FIJA}</p>
      </div>

      {/* Observaciones */}
      <div>
        <p className={heading}>Observaciones (opcional; si queda vacío no sale en el PDF)</p>
        <textarea rows={3} value={value.observaciones} onChange={e => set("observaciones", e.target.value)} disabled={locked} className={`${input} resize-y`} />
      </div>
    </div>
  )
}
