import React from "react"
import { renderToBuffer } from "@react-pdf/renderer"
import { get } from "@vercel/blob"
import { PDFDocument } from "pdf-lib"
import { PdfReport, type OrderData } from "@/components/PdfReport"

type ReportExam = Omit<OrderData["exams"][number], "photos" | "attachedPdf" | "macroPhoto"> & {
  uploadedPdfPath: string | null
  status?: string
  photos: { id: string; url: string; role?: string | null }[] // role "COPRO_MACRO" = foto de la muestra del Coprológico
}

async function readBlob(url: string): Promise<Buffer | null> {
  try {
    const blob = await get(url, { access: "private" })
    if (!blob?.stream) return null
    const chunks: Uint8Array[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for await (const chunk of blob.stream as any) chunks.push(chunk)
    return Buffer.concat(chunks)
  } catch {
    return null
  }
}

// Reporte de una orden: el reporte generado (exámenes capturados en el sistema, más los comentarios y
// fotos de los que se resolvieron con un PDF subido) seguido de las páginas de cada PDF subido.
export async function buildOrderPdf(
  order: Omit<OrderData, "exams">,
  exams: ReportExam[],
): Promise<Uint8Array> {
  // En el reporte de la orden solo van los exámenes completados (un pendiente saldría vacío); si se
  // pide un solo examen, o ninguno está completo, van todos.
  const done = exams.filter(e => e.status === "COMPLETADO")
  const shown = exams.length > 1 && done.length > 0 ? done : exams
  const hasNotes = (e: ReportExam) => !!e.comments || e.photos.some(p => !p.role)
  const inReport = shown.filter(e => !e.uploadedPdfPath || hasNotes(e))

  const merged = await PDFDocument.create()

  if (inReport.length > 0) {
    const reportExams = await Promise.all(
      inReport.map(async e => ({
        ...e,
        attachedPdf: !!e.uploadedPdfPath,
        macroPhoto: await (async () => {
          const p = e.photos.find(x => x.role === "COPRO_MACRO")
          const bytes = p ? await readBlob(p.url) : null
          return bytes ? `data:image/jpeg;base64,${bytes.toString("base64")}` : null
        })(),
        photos: (
          await Promise.all(
            e.photos.filter(p => !p.role).map(async p => {
              const bytes = await readBlob(p.url)
              return bytes ? { id: p.id, src: `data:image/jpeg;base64,${bytes.toString("base64")}` } : null
            }),
          )
        ).filter((p): p is { id: string; src: string } => p !== null),
      })),
    )
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const render = renderToBuffer as (el: any) => Promise<Buffer>
    const reportBuffer = await render(React.createElement(PdfReport, { order: { ...order, exams: reportExams } }))
    const reportDoc = await PDFDocument.load(reportBuffer)
    const pages = await merged.copyPages(reportDoc, reportDoc.getPageIndices())
    pages.forEach(p => merged.addPage(p))
  }

  // Cada PDF subido (reportes hechos por fuera del sistema), en el orden de la orden
  for (const exam of shown.filter(e => e.uploadedPdfPath)) {
    const bytes = await readBlob(exam.uploadedPdfPath!)
    if (!bytes) continue
    try {
      const uploadedDoc = await PDFDocument.load(bytes, { ignoreEncryption: true })
      const pages = await merged.copyPages(uploadedDoc, uploadedDoc.getPageIndices())
      pages.forEach(p => merged.addPage(p))
    } catch {
      // Se salta el PDF que no se pueda leer en vez de tumbar todo el reporte
    }
  }

  return merged.save()
}
