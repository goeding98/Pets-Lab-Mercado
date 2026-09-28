import { redirect } from "next/navigation"

// El portal de resultados ahora es el Portal Vet
export default function ResultadosPage() {
  redirect("/portal-vet")
}
