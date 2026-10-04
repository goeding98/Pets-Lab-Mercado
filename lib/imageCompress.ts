// Solo navegador. Reduce una foto a JPEG de máx. 1600 px: el celular saca fotos de varios MB que no
// pasan el límite de subida de Vercel (4.5 MB) y harían pesadísimo el PDF. El navegador ya aplica la
// orientación EXIF. Lo usan "Comentarios y fotos" y la foto de la muestra del Coprológico.
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("No es una imagen válida")) }
    img.src = url
  })
}

export async function compressToJpeg(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
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

// Sube una foto (ya comprimida) a un examen de una orden; role identifica fotos especiales
export async function uploadExamPhoto(examId: string, file: File, role?: string): Promise<{ id: string; name: string }> {
  const jpeg = await compressToJpeg(file)
  const fd = new FormData()
  fd.append("file", new File([jpeg], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" }))
  if (role) fd.append("role", role)
  const res = await fetch(`/api/upload/${examId}/photos`, { method: "POST", body: fd })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
