"use client"
import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { saveExamComments } from "@/actions/orders"

type Photo = { id: string; name: string }

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No es una imagen válida")) }
    img.src = url
  })
}

// Reduce la foto a JPEG de máx. 1600 px: el celular saca fotos de varios MB que no pasan el límite
// de subida de Vercel (4.5 MB) y harían pesadísimo el PDF. El navegador ya aplica la orientación EXIF.
async function compressToJpeg(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
  const img = await loadImage(file)
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error("No se pudo procesar la foto"))), "image/jpeg", quality),
  )
}

// Comentarios y fotos del encargado al final de cada examen. Salen en el PDF debajo de los resultados.
export default function ExamNotes({
  examId,
  comments,
  photos,
  readOnly,
}: {
  examId: string
  comments: string | null
  photos: Photo[]
  readOnly: boolean
}) {
  const [text, setText] = useState(comments ?? "")
  const [savedText, setSavedText] = useState(comments ?? "")
  const [saving, startSaving] = useTransition()
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  if (readOnly && !comments && photos.length === 0) return null

  function handleSaveComments() {
    startSaving(async () => {
      await saveExamComments(examId, text)
      setSavedText(text)
    })
  }

  async function handleFiles(files: FileList) {
    setUploading(true)
    try {
      for (const file of Array.from(files)) {
        const jpeg = await compressToJpeg(file)
        const fd = new FormData()
        fd.append("file", new File([jpeg], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }))
        const res = await fetch(`/api/upload/${examId}/photos`, { method: "POST", body: fd })
        if (!res.ok) throw new Error(await res.text())
      }
      router.refresh()
    } catch {
      alert("No se pudo subir alguna foto. Intenta de nuevo.")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function handleDelete(photoId: string) {
    if (!confirm("¿Eliminar esta foto?")) return
    const res = await fetch(`/api/photos/${photoId}`, { method: "DELETE" })
    if (!res.ok) alert("No se pudo eliminar la foto.")
    router.refresh()
  }

  const dirty = text !== savedText

  return (
    <div className="pt-4 mt-4 border-t border-black/[0.06]">
      <p className="font-mono text-[8px] tracking-[0.2em] text-ink-2 uppercase mb-2">Comentarios y fotos</p>

      {readOnly ? (
        comments && <p className="font-sans text-sm text-ink whitespace-pre-wrap mb-3">{comments}</p>
      ) : (
        <div className="mb-3">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            rows={3}
            placeholder="Comentarios del examen (salen en el reporte PDF)…"
            className="w-full border border-black/20 bg-white px-3 py-2 text-sm font-sans focus:outline-salvia-700 resize-y"
          />
          <div className="flex items-center gap-3 mt-1.5">
            <button
              onClick={handleSaveComments}
              disabled={saving || !dirty}
              className="border border-salvia-700 text-salvia-700 font-mono text-[9px] tracking-[0.2em] uppercase px-4 py-2 hover:bg-salvia-50 transition-colors disabled:opacity-40"
            >
              {saving ? "Guardando…" : "Guardar comentario"}
            </button>
            {!dirty && savedText && !saving && (
              <span className="font-mono text-[9px] tracking-[0.15em] text-salvia-700 uppercase">✓ Guardado</span>
            )}
          </div>
        </div>
      )}

      {(photos.length > 0 || !readOnly) && (
        <div className="flex flex-wrap gap-2 items-start">
          {photos.map(p => (
            <div key={p.id} className="relative group">
              <a href={`/api/photos/${p.id}`} target="_blank" title={p.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/photos/${p.id}`}
                  alt={p.name}
                  className="w-24 h-24 object-cover border border-black/10"
                />
              </a>
              {!readOnly && (
                <button
                  onClick={() => handleDelete(p.id)}
                  title="Eliminar foto"
                  className="absolute top-1 right-1 bg-white/90 text-red-600 font-mono text-[10px] leading-none w-5 h-5 border border-black/10 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {!readOnly && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => { if (e.target.files?.length) handleFiles(e.target.files) }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-24 h-24 border border-dashed border-salvia-700/50 text-salvia-700 font-mono text-[9px] tracking-[0.15em] uppercase hover:bg-salvia-50 transition-colors disabled:opacity-60"
              >
                {uploading ? "Subiendo…" : "+ Foto"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
