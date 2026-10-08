import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import Sidebar from "@/components/Sidebar"
import OpenSamplesBar from "@/components/OpenSamplesBar"

export default async function LabLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  // Las clínicas usan el Portal Vet, no el LIMS
  if (session.user.role === "CLINIC") redirect("/portal-vet/dashboard")

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-bone">
      <Sidebar userName={session.user.name ?? ""} role={session.user.role} />
      <main className="flex-1 min-w-0 overflow-auto">
        <OpenSamplesBar />
        {children}
      </main>
    </div>
  )
}
