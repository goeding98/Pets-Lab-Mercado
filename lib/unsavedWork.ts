// Solo navegador. Qué exámenes tienen cambios sin guardar en la página actual: lo usan las pestañas de
// exámenes (punto de "sin guardar") y la barra de muestras abiertas (avisa antes de cambiar de muestra).
const dirty = new Set<string>()
export const UNSAVED_EVENT = "petslab:unsaved"

export function setUnsaved(examId: string, isDirty: boolean) {
  const had = dirty.has(examId)
  if (isDirty) dirty.add(examId)
  else dirty.delete(examId)
  if (had !== isDirty && typeof window !== "undefined") window.dispatchEvent(new CustomEvent(UNSAVED_EVENT))
}

export const isUnsaved = (examId: string) => dirty.has(examId)
export const unsavedCount = () => dirty.size
