// "Fuera de rango" de un resultado numérico contra el rango de referencia de la especie ("60 – 77").
// Fuente única para el formulario (ExamResultForm) y el PDF (PdfReport): mismos criterios y mismos
// colores en los dos — bajo = azul, alto = rojo. Sin imports de servidor.
export type RangeStatus = "normal" | "low" | "high"

export function getRangeStatus(value: string | null | undefined, ref: string | null | undefined): RangeStatus {
  if (!ref || !value || isNaN(Number(value))) return "normal"
  const num = Number(value)
  const match = ref.match(/^([\d.]+)\s*[–-]\s*([\d.]+)/)
  if (!match) return "normal"
  if (num < Number(match[1])) return "low"
  if (num > Number(match[2])) return "high"
  return "normal"
}

// Rango que aplica según la especie de la orden ("Otro" no tiene rango)
export const refForSpecies = (species: string, f: { refCanine?: string | null; refFeline?: string | null }) =>
  species === "Felino" ? f.refFeline ?? null : species === "Canino" ? f.refCanine ?? null : null

// Mismos tonos que el formulario (Tailwind blue-600 / red-600)
export const RANGE_COLORS = { low: "#2563eb", high: "#dc2626" } as const
