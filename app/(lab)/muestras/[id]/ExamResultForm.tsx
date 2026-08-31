"use client"
import { useState, useTransition, useRef } from "react"
import { useRouter } from "next/navigation"
import { saveExamResults } from "@/actions/orders"

type Field = {
  id: string
  name: string
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
  uploadedPdfPath: string | null
  uploadedPdfName: string | null
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

export default function ExamResultForm({ exam }: { exam: ExamProp }) {
  const allFields = exam.template.sections.flatMap(s => s.fields)
  const initialValues: Record<string, string> = {}
  for (const r of exam.results) initialValues[r.fieldId] = r.value
  for (const f of allFields) {
    if (!initialValues[f.id]) initialValues[f.id] = ""
  }

  const [values, setValues] = useState<Record<string, string>>(initialValues)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()
  const [uploadedPath, setUploadedPath] = useState<string | null>(exam.uploadedPdfPath)
  const [uploadedName, setUploadedName] = useState<string | null>(exam.uploadedPdfName)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleUpload(file: File) {
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch(`/api/upload/${exam.id}`, { method: "POST", body: fd })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setUploadedPath(data.path)
      setUploadedName(data.name)
      router.refresh()
    } catch {
      alert("No se pudo subir el PDF. Intenta de nuevo.")
    } finally {
      setUploading(false)
    }
  }

  async function handleRemoveUpload() {
    setUploading(true)
    try {
      const res = await fetch(`/api/upload/${exam.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error(await res.text())
      setUploadedPath(null)
      setUploadedName(null)
      router.refresh()
    } catch {
      alert("No se pudo eliminar el PDF. Intenta de nuevo.")
    } finally {
      setUploading(false)
    }
  }

  function getValue(fieldId: string) {
    return values[fieldId] ?? ""
  }

  function getCalcValue(field: Field, species: "canine" | "feline" = "canine"): string {
    if (!field.calcFormula) return ""
    // Simple two-operand formulas: "a - b", "a / b", "a + b"
    const formula = field.calcFormula
    const normalizedNames = Object.fromEntries(
      allFields.map(f => [f.name.toLowerCase().replace(/[^a-z0-9]/g, "_"), f.id])
    )

    function resolveId(token: string): string | undefined {
      return normalizedNames[token.trim()]
    }

    const minusMatch = formula.match(/^(.+?)\s*-\s*(.+)$/)
    const divMatch = formula.match(/^(.+?)\s*\/\s*(.+)$/)
    const plusMatch = formula.match(/^(.+?)\s*\+\s*(.+)$/)

    let result: number | null = null

    if (minusMatch) {
      const aId = resolveId(minusMatch[1])
      const bId = resolveId(minusMatch[2])
      if (aId && bId) {
        const a = Number(values[aId])
        const b = Number(values[bId])
        if (!isNaN(a) && !isNaN(b)) result = Math.round((a - b) * 100) / 100
      }
    } else if (divMatch) {
      const aId = resolveId(divMatch[1])
      const bId = resolveId(divMatch[2])
      if (aId && bId) {
        const a = Number(values[aId])
        const b = Number(values[bId])
        if (!isNaN(a) && !isNaN(b) && b !== 0) result = Math.round((a / b) * 100) / 100
      }
    } else if (plusMatch) {
      const aId = resolveId(plusMatch[1])
      const bId = resolveId(plusMatch[2])
      if (aId && bId) {
        const a = Number(values[aId])
        const b = Number(values[bId])
        if (!isNaN(a) && !isNaN(b)) result = Math.round((a + b) * 100) / 100
      }
    }

    return result !== null ? String(result) : ""
  }

  function handleChange(fieldId: string, value: string) {
    setValues(prev => ({ ...prev, [fieldId]: value }))
    setSaved(false)
  }

  function handleSave() {
    const results = allFields.map(f => {
      const value = f.fieldType === "calculated" ? getCalcValue(f) : (values[f.id] ?? "")
      const ref = f.refCanine
      const flagged = isOutOfRange(value, ref)
      return { fieldId: f.id, value, flagged }
    })

    startTransition(async () => {
      await saveExamResults(exam.id, results)
      setSaved(true)
    })
  }

  const isComplete = exam.status === "COMPLETADO"

  return (
    <div className="border border-black/10">
      <div className="bg-salvia-50 border-b border-black/10 px-5 py-3 flex items-center justify-between">
        <div>
          <p className="font-serif text-[17px] font-medium tracking-[-0.01em]">{exam.template.name}</p>
          <p className="font-mono text-[8px] tracking-[0.18em] text-salvia-700 uppercase mt-0.5">{exam.template.area}</p>
        </div>
        <span className={`font-mono text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 ${
          isComplete ? "bg-salvia-700 text-bone" : "bg-black/10 text-ink"
        }`}>
          {isComplete ? "Completado" : "Pendiente"}
        </span>
      </div>

      <div className="px-5 py-4">
        {exam.template.sections.map(section => (
          <div key={section.id} className="mb-5">
            <p className="font-mono text-[8px] tracking-[0.2em] text-ink-2 uppercase mb-3 border-b border-black/[0.06] pb-1">
              {section.name}
            </p>
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
                    const status = getRangeStatus(val, field.refCanine)
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
                              disabled={isComplete}
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
                              disabled={isComplete}
                              className="border border-black/20 bg-white px-1.5 py-1 text-xs font-sans w-full focus:outline-salvia-700 disabled:bg-black/5 disabled:cursor-default"
                              placeholder="—"
                            />
                          ) : (
                            <input
                              type="number"
                              step="any"
                              value={getValue(field.id)}
                              onChange={e => handleChange(field.id, e.target.value)}
                              disabled={isComplete}
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
              {!isComplete && (
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

          {/* Action buttons */}
          {!isComplete && !uploadedPath && (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={handleSave}
                disabled={pending}
                className="bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.22em] uppercase px-5 py-2.5 hover:bg-salvia-800 transition-colors disabled:opacity-60"
              >
                {pending ? "Guardando…" : "Guardar resultados →"}
              </button>
              <span className="font-mono text-[9px] text-ink-2 uppercase tracking-widest">o</span>
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
                {uploading ? "Subiendo…" : "Subir PDF →"}
              </button>
              {saved && (
                <span className="font-mono text-[9px] tracking-[0.15em] text-salvia-700 uppercase">
                  ✓ Guardado
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
