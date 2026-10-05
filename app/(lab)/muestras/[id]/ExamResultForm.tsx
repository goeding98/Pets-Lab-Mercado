"use client"
import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { upload } from "@vercel/blob/client"
import { saveExamResults } from "@/actions/orders"
import { computeNetPrice, getPaymentStatus } from "@/lib/billing"
import { formatCOP } from "@/lib/payment"
import { evaluar } from "@/catalogo-pets-lab/calculos"
import ExamNotes from "./ExamNotes"
import { isDescriptiveSection } from "@/lib/sections"
import { referenceTableFor } from "@/lib/referenceTables"
import { isCoproSection, isCoproscopicoSection, phError, readCopro, readCoproscopico } from "@/lib/coprologico"
import CoproscopicoFields from "@/components/CoproscopicoFields"
import OrinaForm from "@/components/OrinaForm"
import { isOrinaSection, orinaErrors, readOrina, type OrinaConfig, type Reactivo } from "@/lib/orina"
import CoproForm from "@/components/CoproForm"

type Field = {
  id: string
  name: string
  key: string | null
  unit: string | null
  refCanine: string | null
  refFeline: string | null
  technique: string | null
  fieldType: string
  calcFormula: string | null
  order: number
}

type Section = {
  id: string
  name: string
  order: number
  fields: Field[]
}

type ExamProp = {
  id: string
  status: string
  price: number
  discountType: string
  discountValue: number
  amountPaid: number
  uploadedPdfPath: string | null
  uploadedPdfName: string | null
  comments: string | null
  photos: { id: string; name: string }[]
  structured: unknown // bloques con formulario propio (Coprológico)
  macroPhoto: { id: string } | null // foto de la muestra del Coprológico
  template: {
    name: string
    area: string
    sections: Section[]
  }
  results: { fieldId: string; value: string; flagged: boolean }[]
}

type RangeStatus = "normal" | "low" | "high"

function getRangeStatus(value: string, ref: string | null): RangeStatus {
  if (!ref || !value || isNaN(Number(value))) return "normal"
  const num = Number(value)
  const match = ref.match(/^([\d.]+)\s*[–-]\s*([\d.]+)/)
  if (!match) return "normal"
  if (num < Number(match[1])) return "low"
  if (num > Number(match[2])) return "high"
  return "normal"
}

function isOutOfRange(value: string, ref: string | null): boolean {
  const s = getRangeStatus(value, ref)
  return s === "low" || s === "high"
}

export default function ExamResultForm({
  exam,
  species,
  readOnly = false,
  released = true,
  balance = 0,
  orinaConfig,
  reagents = [],
}: {
  exam: ExamProp
  species: string
  readOnly?: boolean
  released?: boolean // ¿la clínica puede ver el resultado? (pago, ver lib/payment.ts)
  balance?: number // saldo de la orden
  orinaConfig?: OrinaConfig // valores de referencia del Parcial de Orina (LabSetting)
  reagents?: Reactivo[] // reactivos con lote del inventario (control de calidad de la orina)
}) {
  // "Fuera de rango" se evalúa contra el rango de la especie del paciente
  const refFor = (f: Field) => (species === "Felino" ? f.refFeline : species === "Canino" ? f.refCanine : null)

  const allFields = exam.template.sections.flatMap(s => s.fields)
  const initialValues: Record<string, string> = {}
  for (const r of exam.results) initialValues[r.fieldId] = r.value
  for (const f of allFields) {
    if (!initialValues[f.id]) initialValues[f.id] = ""
  }

  const [values, setValues] = useState<Record<string, string>>(initialValues)
  const [saved, setSaved] = useState(false)
  // Tras guardar o subir PDF en una orden sin pago: aviso de que el resultado queda retenido
  const [heldNotice, setHeldNotice] = useState(false)
  // Un examen completado queda bloqueado; "Editar" lo abre para corregir y volver a guardar
  const [editing, setEditing] = useState(false)
  const hasCoproscopico = exam.template.sections.some(s => isCoproscopicoSection(s.name))
  const hasCopro = hasCoproscopico || exam.template.sections.some(s => isCoproSection(s.name))
  const [copro, setCopro] = useState(() => readCopro(exam.structured))
  const [coproscopico, setCoproscopico] = useState(() => readCoproscopico(exam.structured))
  const hasOrina = exam.template.sections.some(s => isOrinaSection(s.name))
  const [orina, setOrina] = useState(() => readOrina(exam.structured))
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [uploadedPath, setUploadedPath] = useState<string | null>(exam.uploadedPdfPath)
  const [uploadedName, setUploadedName] = useState<string | null>(exam.uploadedPdfName)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const netPrice = computeNetPrice(exam.price, exam.discountType, exam.discountValue)
  const paymentStatus = getPaymentStatus(netPrice, exam.amountPaid)

  // El PDF va directo del navegador a Vercel Blob (sin el límite de 4.5 MB de las funciones) y
  // después se registra en el examen.
  async function handleUpload(file: File) {
    setUploadError(null)
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      setUploadError("El archivo debe ser un PDF.")
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadError("El PDF pesa más de 50 MB.")
      return
    }
    setUploading(true)
    setProgress(0)
    try {
      const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9._-]+/g, "-") || "resultado.pdf"
      const blob = await upload(`uploads/${exam.id}/${safeName}`, file, {
        access: "private",
        contentType: "application/pdf",
        handleUploadUrl: `/api/upload/${exam.id}/token`,
        onUploadProgress: e => setProgress(Math.round(e.percentage)),
      })
      const res = await fetch(`/api/upload/${exam.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: blob.url, name: file.name }),
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setUploadedPath(data.path)
      setUploadedName(data.name)
      if (!released) setHeldNotice(true)
      router.refresh()
    } catch (err) {
      console.error(err)
      setUploadError("No se pudo subir el PDF. Revisa la conexión e intenta de nuevo.")
    } finally {
      setUploading(false)
      setProgress(null)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function handleRemoveUpload() {
    if (!confirm("¿Eliminar el PDF adjunto?")) return
    setUploading(true)
    setUploadError(null)
    try {
      const res = await fetch(`/api/upload/${exam.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(await res.text())
      setUploadedPath(null)
      setUploadedName(null)
      router.refresh()
    } catch {
      setUploadError("No se pudo eliminar el PDF. Intenta de nuevo.")
    } finally {
      setUploading(false)
    }
  }

  function getValue(fieldId: string) {
    return values[fieldId] ?? ""
  }

  // Cada campo se identifica para las fórmulas por su `key` (id del catálogo).
  // Los campos legado sin `key` caen al nombre normalizado, por compatibilidad.
  function formulaKey(field: Field): string {
    return field.key || field.name.toLowerCase().replace(/[^a-z0-9]/g, "_")
  }

  // Resuelve todos los campos calculados del examen a partir de los valores digitados,
  // repitiendo hasta que no haya cambios (un calculado puede depender de otro calculado).
  function getResolvedValues(): Record<string, number> {
    const resolved: Record<string, number> = {}
    for (const f of allFields) {
      if (f.fieldType === "calculated") continue
      const raw = values[f.id]
      const num = Number(raw)
      if (raw !== "" && raw != null && !isNaN(num)) resolved[formulaKey(f)] = num
    }

    const calcFields = allFields.filter(f => f.fieldType === "calculated" && f.calcFormula)
    for (let i = 0; i < calcFields.length + 1; i++) {
      let changed = false
      for (const f of calcFields) {
        const k = formulaKey(f)
        if (resolved[k] != null) continue
        const v = evaluar(f.calcFormula!, resolved)
        if (v !== null) {
          resolved[k] = v
          changed = true
        }
      }
      if (!changed) break
    }
    return resolved
  }

  function getCalcValue(field: Field): string {
    if (!field.calcFormula) return ""
    const resolved = getResolvedValues()
    const v = resolved[formulaKey(field)]
    return v !== undefined ? String(v) : ""
  }

  function handleChange(fieldId: string, value: string) {
    setValues(prev => ({ ...prev, [fieldId]: value }))
    setSaved(false)
  }

  function handleSave() {
    const results = allFields.map(f => {
      const value = f.fieldType === "calculated" ? getCalcValue(f) : (values[f.id] ?? "")
      const flagged = isOutOfRange(value, refFor(f))
      return { fieldId: f.id, value, flagged }
    })

    setSaveError(null)
    const phInvalid = hasCoproscopico && phError(coproscopico.ph)
    if (phInvalid) { setSaveError(phInvalid); return }
    const orinaInvalid = hasOrina ? orinaErrors(orina) : []
    if (orinaInvalid.length) { setSaveError(orinaInvalid.join(". ") + "."); return }
    const structured = {
      ...(hasCopro ? { copro } : {}),
      ...(hasCoproscopico ? { coproscopico } : {}),
      ...(hasOrina ? { orina } : {}),
    }
    startTransition(async () => {
      try {
        await saveExamResults(exam.id, results, Object.keys(structured).length ? structured : undefined)
        setSaved(true)
        setEditing(false)
        if (!released) setHeldNotice(true)
        router.refresh()
      } catch (err) {
        // Sin esto un fallo del servidor (sesión vencida, timeout de la BD, deploy nuevo) se
        // pierde en silencio y parece que el botón "no guarda".
        console.error(err)
        setSaveError("No se pudieron guardar los resultados. Recarga la página e intenta de nuevo; lo digitado sigue en pantalla.")
      }
    })
  }

  const refTable = referenceTableFor(exam.template.name)
  const isComplete = exam.status === "COMPLETADO"
  const locked = (isComplete && !editing) || readOnly

  function startEditing() {
    setSaved(false)
    setSaveError(null)
    setEditing(true)
  }

  // Descarta lo digitado y vuelve a lo guardado
  function cancelEditing() {
    setValues(initialValues)
    setCopro(readCopro(exam.structured))
    setCoproscopico(readCoproscopico(exam.structured))
    setOrina(readOrina(exam.structured))
    setSaveError(null)
    setEditing(false)
  }

  return (
    <div className="border border-black/10">
      <div className="bg-salvia-50 border-b border-black/10 px-5 py-3 flex items-center justify-between">
        <div>
          <p className="font-serif text-[17px] font-medium tracking-[-0.01em]">{exam.template.name}</p>
          <p className="font-mono text-[8px] tracking-[0.18em] text-salvia-700 uppercase mt-0.5">{exam.template.area}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {isComplete && !readOnly && (
            editing ? (
              <button
                type="button"
                onClick={cancelEditing}
                disabled={pending}
                className="font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-1 border border-black/20 text-ink hover:bg-black/5 disabled:opacity-50"
              >
                Cancelar edición
              </button>
            ) : (
              <button
                type="button"
                onClick={startEditing}
                className="font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-1 border border-salvia-700 text-salvia-700 hover:bg-salvia-700 hover:text-bone transition-colors"
              >
                Editar
              </button>
            )
          )}
          <span
            title="Se calcula desde Caja según precio, descuento y valor pagado"
            className={`font-mono text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 ${paymentStatus.className}`}
          >
            {paymentStatus.label}
          </span>
          <span className={`font-mono text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 ${
            isComplete ? "bg-salvia-700 text-bone" : "bg-black/10 text-ink"
          }`}>
            {isComplete ? (editing ? "Editando" : "Completado") : "Pendiente"}
          </span>
        </div>
      </div>

      {editing && (
        <p className="bg-amber-50 border-b border-amber-200 px-5 py-2 font-sans text-xs text-ink">
          Editando un resultado ya completado. Los cambios quedan al dar <strong>Guardar cambios</strong>; el reporte PDF sale con los valores nuevos.
        </p>
      )}

      <div className="px-5 py-4">
        {exam.template.sections.map(section => (
          <div key={section.id} className="mb-5">
            <p className="font-mono text-[8px] tracking-[0.2em] text-ink-2 uppercase mb-3 border-b border-black/[0.06] pb-1">
              {section.name}
            </p>
            {isOrinaSection(section.name) && orinaConfig ? (
              <OrinaForm value={orina} onChange={v => { setOrina(v); setSaved(false) }} locked={locked} species={species} config={orinaConfig} reagents={reagents} />
            ) : isCoproscopicoSection(section.name) ? (
              <CoproForm
                value={copro}
                onChange={v => { setCopro(v); setSaved(false) }}
                locked={locked}
                examId={exam.id}
                photo={exam.macroPhoto}
                extra={<CoproscopicoFields value={coproscopico} onChange={v => { setCoproscopico(v); setSaved(false) }} locked={locked} />}
              />
            ) : isCoproSection(section.name) ? (
              <CoproForm value={copro} onChange={v => { setCopro(v); setSaved(false) }} locked={locked} examId={exam.id} photo={exam.macroPhoto} />
            ) : isDescriptiveSection(section.name, exam.template.name) ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left">
                    <th className="font-mono text-[8px] tracking-[0.15em] text-salvia-700 uppercase pb-2 pr-3 w-[220px]">Parámetro</th>
                    <th className="font-mono text-[8px] tracking-[0.15em] text-salvia-700 uppercase pb-2">Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {section.fields.map(field => (
                    <tr key={field.id} className="border-t border-black/[0.05] align-top">
                      <td className="py-2 pr-3 font-sans text-xs text-ink">{field.name}</td>
                      <td className="py-2">
                        <textarea
                          rows={3}
                          value={getValue(field.id)}
                          onChange={e => handleChange(field.id, e.target.value)}
                          disabled={locked}
                          className="border border-black/20 bg-white px-2 py-1.5 text-xs font-sans w-full resize-y focus:outline-salvia-700 disabled:bg-black/5 disabled:cursor-default"
                          placeholder="—"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left">
                    <th className="font-mono text-[8px] tracking-[0.15em] text-salvia-700 uppercase pb-2 pr-3 w-[220px]">Parámetro</th>
                    <th className="font-mono text-[8px] tracking-[0.15em] text-salvia-700 uppercase pb-2 pr-3 w-[80px]">Unidad</th>
                    <th className="font-mono text-[8px] tracking-[0.15em] text-salvia-700 uppercase pb-2 pr-3 w-[110px]">Resultado</th>
                    <th className="font-mono text-[8px] tracking-[0.15em] text-salvia-700 uppercase pb-2 pr-3 w-[140px]">Ref. canino</th>
                    <th className="font-mono text-[8px] tracking-[0.15em] text-salvia-700 uppercase pb-2 pr-3 w-[140px]">Ref. felino</th>
                    <th className="font-mono text-[8px] tracking-[0.15em] text-salvia-700 uppercase pb-2">Técnica</th>
                  </tr>
                </thead>
                <tbody>
                  {section.fields.map(field => {
                    const val = field.fieldType === "calculated" ? getCalcValue(field) : getValue(field.id)
                    const status = getRangeStatus(val, refFor(field))
                    const flagged = status !== "normal"

                    const resultColor =
                      status === "low" ? "text-blue-600 font-bold" :
                      status === "high" ? "text-red-600 font-bold" :
                      "text-ink"

                    const inputBorder =
                      status === "low" ? "border-blue-400 text-blue-600" :
                      status === "high" ? "border-red-400 text-red-600" :
                      "border-black/20"

                    return (
                      <tr key={field.id} className="border-t border-black/[0.05]">
                        <td className="py-1.5 pr-3 font-sans text-xs text-ink">{field.name}</td>
                        <td className="py-1.5 pr-3 font-mono text-[10px] text-ink-2">{field.unit ?? ""}</td>
                        <td className="py-1.5 pr-3">
                          {field.fieldType === "calculated" ? (
                            <span className={`font-mono text-[11px] ${resultColor}`}>
                              {val || "—"}
                            </span>
                          ) : field.fieldType === "select" ? (
                            <select
                              value={getValue(field.id)}
                              onChange={e => handleChange(field.id, e.target.value)}
                              disabled={locked}
                              className="border border-black/20 bg-white px-1.5 py-1 text-xs font-sans w-full focus:outline-salvia-700 disabled:bg-black/5 disabled:cursor-default"
                            >
                              <option value="">—</option>
                              <option>Negativo</option>
                              <option>Positivo</option>
                              <option>Trazas</option>
                              <option>Escaso</option>
                              <option>Moderado</option>
                              <option>Abundante</option>
                              <option>Claro</option>
                              <option>Turbio</option>
                              <option>Hemolítico</option>
                              <option>Aceptable</option>
                              <option>Buena</option>
                              <option>Derecho</option>
                              <option>Izquierdo</option>
                              <option>Ambos</option>
                            </select>
                          ) : field.fieldType === "text" ? (
                            <input
                              type="text"
                              value={getValue(field.id)}
                              onChange={e => handleChange(field.id, e.target.value)}
                              disabled={locked}
                              className="border border-black/20 bg-white px-1.5 py-1 text-xs font-sans w-full focus:outline-salvia-700 disabled:bg-black/5 disabled:cursor-default"
                              placeholder="—"
                            />
                          ) : (
                            <input
                              type="number"
                              step="any"
                              value={getValue(field.id)}
                              onChange={e => handleChange(field.id, e.target.value)}
                              disabled={locked}
                              className={`border bg-white px-1.5 py-1 text-xs font-mono w-20 focus:outline-salvia-700 disabled:bg-black/5 disabled:cursor-default ${inputBorder}`}
                              placeholder="—"
                            />
                          )}
                        </td>
                        <td className="py-1.5 pr-3 font-mono text-[10px] text-ink-2">{field.refCanine ?? "—"}</td>
                        <td className="py-1.5 pr-3 font-mono text-[10px] text-ink-2">{field.refFeline ?? "—"}</td>
                        <td className="py-1.5 font-mono text-[10px] text-ink-2">{field.technique ?? "—"}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            )}
          </div>
        ))}

        <div className="pt-2 border-t border-black/[0.06] mt-2 space-y-3">
          {/* Uploaded PDF state */}
          {uploadedPath ? (
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-salvia-50 border border-salvia-200 px-3 py-2">
                <span className="font-mono text-[9px] tracking-[0.15em] text-salvia-700 uppercase">PDF adjunto:</span>
                <a
                  href={`/api/pdf/exam/${exam.id}`}
                  target="_blank"
                  className="font-sans text-xs text-ink hover:text-salvia-700 hover:underline"
                >
                  {uploadedName}
                </a>
              </div>
              {!readOnly && (
                <button
                  onClick={handleRemoveUpload}
                  disabled={uploading}
                  className="font-mono text-[9px] tracking-[0.15em] text-red-600 hover:text-red-800 uppercase disabled:opacity-50"
                >
                  Eliminar →
                </button>
              )}
            </div>
          ) : null}

          {/* Action buttons: guardar (pendiente o en edición) y subir PDF (mientras no haya uno) */}
          {!readOnly && (!locked || !uploadedPath) && (
            <div className="flex items-center gap-3 flex-wrap">
              {!locked && (
                <>
                  <button
                    onClick={handleSave}
                    disabled={pending}
                    className="bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.22em] uppercase px-5 py-2.5 hover:bg-salvia-800 transition-colors disabled:opacity-60"
                  >
                    {pending ? "Guardando…" : editing ? "Guardar cambios →" : "Guardar resultados →"}
                  </button>
                  {!uploadedPath && <span className="font-mono text-[9px] text-ink-2 uppercase tracking-widest">o</span>}
                </>
              )}
              {!uploadedPath && (<>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="border border-salvia-700 text-salvia-700 font-mono text-[10px] tracking-[0.22em] uppercase px-5 py-2.5 hover:bg-salvia-50 transition-colors disabled:opacity-60"
              >
                {uploading ? `Subiendo… ${progress ?? 0}%` : "Subir PDF →"}
              </button>
              </>)}
              {saved && (
                <span className="font-mono text-[9px] tracking-[0.15em] text-salvia-700 uppercase">
                  ✓ Guardado
                </span>
              )}
            </div>
          )}
          {saveError && (
            <p className="font-sans text-xs text-red-600">{saveError}</p>
          )}
          {uploadError && (
            <p className="font-sans text-xs text-red-600">{uploadError}</p>
          )}
          {heldNotice && !released && (
            <div role="alert" className="border border-red-300 bg-red-50 px-4 py-3 font-sans text-[13px] text-ink">
              <strong className="text-red-700">El cliente no ha pagado.</strong> El resultado quedó guardado pero
              <strong> no se le muestra a la clínica</strong> hasta que se marque el pago
              {balance > 0 ? ` (${formatCOP(balance)})` : ""} arriba, en el módulo de pago de la muestra.
            </div>
          )}
        </div>

        {refTable && (
          <div className="mt-4">
            <p className="font-mono text-[8px] tracking-[0.2em] text-ink-2 uppercase mb-2 border-b border-black/[0.06] pb-1">
              {refTable.title}
            </p>
            <table className="text-xs">
              <thead>
                <tr className="text-left">
                  {refTable.columns.map(c => (
                    <th key={c} className="font-mono text-[8px] tracking-[0.15em] text-salvia-700 uppercase pb-2 pr-8">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {refTable.rows.map((row, ri) => (
                  <tr key={ri} className="border-t border-black/[0.05]">
                    {row.map((cell, ci) => (
                      <td key={ci} className={`py-1.5 pr-8 ${ci === 0 ? "font-sans text-xs text-ink" : "font-mono text-[10px] text-ink-2"}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ExamNotes examId={exam.id} comments={exam.comments} photos={exam.photos} readOnly={readOnly} />
      </div>
    </div>
  )
}
