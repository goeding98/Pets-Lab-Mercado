"use client"
import { Fragment, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  CANTIDAD, COLOR, CONSISTENCIA, FRASES, NOTA_FIJA, PARASITOS_FLOTACION, PRESENCIA, PROTOZOOS,
  parseMarkup, stripMarkup, type CoproData,
} from "@/lib/coprologico"
import { uploadExamPhoto } from "@/lib/imageCompress"

// Formulario del Coprológico (resultado estructurado, ver lib/coprologico.ts). Lo pinta
// ExamResultForm en lugar de la tabla de campos cuando la sección es "Coprológico".

const input = "border border-black/20 bg-white px-2 py-1.5 text-xs font-sans w-full focus:outline-salvia-700 disabled:bg-black/5 disabled:cursor-default"
const label = "block font-mono text-[8px] tracking-[0.15em] text-salvia-700 uppercase mb-1"
const heading = "font-mono text-[8px] tracking-[0.2em] text-ink-2 uppercase mb-3 border-b border-black/[0.06] pb-1"
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

function Select({ value, options, onChange, disabled, placeholder = "Seleccionar…" }: {
  value: string; options: string[]; onChange: (v: string) => void; disabled: boolean; placeholder?: string
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className={input}>
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  )
}

function MacroPhoto({ examId, photo, locked }: { examId: string; photo: { id: string } | null; locked: boolean }) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function upload(file: File) {
    setBusy(true)
    try {
      await uploadExamPhoto(examId, file, "COPRO_MACRO")
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

export default function CoproForm({
  value, onChange, locked, examId, photo,
}: {
  value: CoproData
  onChange: (v: CoproData) => void
  locked: boolean
  examId: string
  photo: { id: string } | null
}) {
  const microRef = useRef<HTMLTextAreaElement>(null)
  const set = <K extends keyof CoproData>(k: K, v: CoproData[K]) => onChange({ ...value, [k]: v })

  // Inserta texto en el cursor del análisis microscópico
  function insert(text: string) {
    const el = microRef.current
    const cur = value.microscopico
    const start = el?.selectionStart ?? cur.length
    const end = el?.selectionEnd ?? cur.length
    const before = cur.slice(0, start)
    const sep = before && !/\s$/.test(before) ? " " : ""
    const next = before + sep + text + cur.slice(end)
    set("microscopico", next)
    requestAnimationFrame(() => {
      if (!el) return
      el.focus()
      const pos = (before + sep + text).length
      el.setSelectionRange(pos, pos)
    })
  }

  // Envuelve la selección con ** (negrita) o * (cursiva)
  function wrap(mark: string) {
    const el = microRef.current
    if (!el) return
    const cur = value.microscopico
    const { selectionStart: s, selectionEnd: e } = el
    if (s === e) return
    set("microscopico", cur.slice(0, s) + mark + cur.slice(s, e) + mark + cur.slice(e))
  }

  const proto = value.protozoos
  const flot = value.flotacion

  return (
    <div className="space-y-6">
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
          <MacroPhoto examId={examId} photo={photo} locked={locked} />
        </div>
      </div>

      {/* Análisis microscópico */}
      <div>
        <p className={heading}>Análisis microscópico</p>
        {!locked && (
          <div className="space-y-1.5 mb-3">
            {FRASES.map(f => (
              <div key={f.label} className="flex flex-wrap items-center gap-1.5">
                <span className="font-sans text-[11px] text-ink-2 w-full sm:w-56">{f.label}</span>
                {f.options.map(o => (
                  <button key={o} type="button" onClick={() => insert(f.build(o))} className={chip}>{o}</button>
                ))}
              </div>
            ))}
          </div>
        )}
        {!locked && (
          <div className="flex items-center gap-2 mb-1.5">
            <button type="button" onClick={() => wrap("**")} title="Negrita (selecciona el texto)" className={`${chip} font-bold`}>B</button>
            <button type="button" onClick={() => wrap("*")} title="Cursiva (selecciona el texto)" className={`${chip} italic`}>I</button>
            <span className="font-sans text-[10px] text-ink-2">Selecciona texto y usa B o I. Los nombres científicos van en cursiva.</span>
          </div>
        )}
        <textarea
          ref={microRef}
          rows={5}
          value={value.microscopico}
          onChange={e => set("microscopico", e.target.value)}
          disabled={locked}
          placeholder="Descripción del análisis microscópico…"
          className={`${input} resize-y`}
        />
        {value.microscopico.trim() && (
          <p className="font-sans text-xs text-ink mt-2 text-justify leading-relaxed bg-salvia-50/50 border border-black/[0.05] px-3 py-2">
            <span className="block font-mono text-[8px] tracking-[0.15em] uppercase text-ink-2 mb-1">Así sale en el PDF</span>
            <Markup text={value.microscopico} />
          </p>
        )}
      </div>

      {/* Protozoos */}
      <div>
        <p className={heading}>Protozoos</p>
        <label className="flex items-center gap-2 font-sans text-xs text-ink mb-2">
          <input type="checkbox" checked={proto.ninguno} disabled={locked} onChange={e => set("protozoos", { ...proto, ninguno: e.target.checked })} className="accent-salvia-700" />
          No se observan
        </label>
        {!proto.ninguno && (
          <div className="space-y-2">
            {proto.items.map((it, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-center">
                <input
                  list="copro-protozoos"
                  value={it.hallazgo}
                  onChange={e => set("protozoos", { ...proto, items: proto.items.map((x, j) => j === i ? { ...x, hallazgo: e.target.value } : x) })}
                  disabled={locked}
                  placeholder="Hallazgo (ej. *Giardia sp.* (quistes))"
                  className={`${input} flex-1 min-w-[200px]`}
                />
                <select
                  value={it.cantidad}
                  onChange={e => set("protozoos", { ...proto, items: proto.items.map((x, j) => j === i ? { ...x, cantidad: e.target.value } : x) })}
                  disabled={locked}
                  className={`${input} w-24`}
                >
                  <option value="">Cant.</option>
                  {CANTIDAD.map(c => <option key={c}>{c}</option>)}
                </select>
                {!locked && (
                  <button type="button" onClick={() => set("protozoos", { ...proto, items: proto.items.filter((_, j) => j !== i) })} className="font-mono text-[9px] uppercase text-red-600">✕</button>
                )}
              </div>
            ))}
            <datalist id="copro-protozoos">{PROTOZOOS.map(p => <option key={p} value={p}>{stripMarkup(p)}</option>)}</datalist>
            {!locked && (
              <button type="button" onClick={() => set("protozoos", { ...proto, items: [...proto.items, { hallazgo: "", cantidad: "" }] })} className={chip}>
                + Agregar hallazgo
              </button>
            )}
          </div>
        )}
      </div>

      {/* Técnica de flotación */}
      <div>
        <p className={heading}>Técnica de flotación</p>
        <label className="flex items-center gap-2 font-sans text-xs text-ink mb-2">
          <input type="checkbox" checked={flot.ninguno} disabled={locked} onChange={e => set("flotacion", { ...flot, ninguno: e.target.checked })} className="accent-salvia-700" />
          No se observan huevos
        </label>
        {!flot.ninguno && (
          <div className="space-y-2">
            {flot.items.map((it, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-center">
                <input
                  list="copro-parasitos"
                  value={it.parasito}
                  onChange={e => set("flotacion", { ...flot, items: flot.items.map((x, j) => j === i ? { ...x, parasito: e.target.value } : x) })}
                  disabled={locked}
                  placeholder="Parásito (ej. Toxocara canis)"
                  className={`${input} flex-1 min-w-[200px] italic`}
                />
                <input
                  value={it.hpg}
                  onChange={e => set("flotacion", { ...flot, items: flot.items.map((x, j) => j === i ? { ...x, hpg: e.target.value } : x) })}
                  disabled={locked}
                  inputMode="numeric"
                  placeholder="HPG"
                  className={`${input} w-28`}
                />
                {!locked && (
                  <button type="button" onClick={() => set("flotacion", { ...flot, items: flot.items.filter((_, j) => j !== i) })} className="font-mono text-[9px] uppercase text-red-600">✕</button>
                )}
              </div>
            ))}
            <datalist id="copro-parasitos">{PARASITOS_FLOTACION.map(p => <option key={p} value={p} />)}</datalist>
            <p className="font-sans text-[10px] text-ink-2">HPG = huevos por gramo de materia fecal.</p>
            {!locked && (
              <button type="button" onClick={() => set("flotacion", { ...flot, items: [...flot.items, { parasito: "", hpg: "" }] })} className={chip}>
                + Agregar parásito
              </button>
            )}
          </div>
        )}
      </div>

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
