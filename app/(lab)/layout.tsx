import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { canManageCredit, canSeeBonos, canSeeCartera, canSeeFinance } from "@/lib/permissions"
import Sidebar from "@/components/Sidebar"
import OpenSamplesBar from "@/components/OpenSamplesBar"

export default async function LabLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  // Las clínicas usan el Portal Vet, no el LIMS
  if (session.user.role === "CLINIC") redirect("/portal-vet/dashboard")
  // Usuario cerrado con una sesión que quedó abierta
  if (session.user.role === "INACTIVO") redirect("/api/auth/signout")

  // translate="no": si Chrome traduce la página (celular en otro idioma), cambia el texto por debajo de React y la
  // herramienta se cae con "Application error" al registrar o cambiar algo. El LIMS no se traduce.
  return (
    <div translate="no" className="notranslate flex flex-col md:flex-row min-h-screen bg-bone">
      <Sidebar userName={session.user.name ?? ""} role={session.user.role} finance={canSeeFinance(session.user.role, session.user.email)}
        credit={canManageCredit(session.user.role, session.user.email)}
        cartera={canSeeCartera(session.user.role, session.user.email)}
        bonos={canSeeBonos(session.user.role, session.user.email)}
      />
      <main className="flex-1 min-w-0 overflow-auto">
        <OpenSamplesBar />
        {children}
      </main>
    </div>
  )
}
