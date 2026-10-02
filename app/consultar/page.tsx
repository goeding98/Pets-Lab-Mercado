import { redirect } from "next/navigation"

// La consulta pública por número de orden se quitó (los números son consecutivos y exponían datos
// de pacientes); los resultados se ven en el Portal Vet, con sesión.
export default function ConsultarPage() {
  redirect("/portal-vet")
}
