import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import Sidebar from "@/components/Sidebar"

export default async function LabLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  // Only ADMIN and STAFF can access lab routes
  if (session.user.role === "CLINIC") redirect("/mis-muestras")

  return (
    <div className="flex min-h-screen bg-bone">
      <Sidebar userName={session.user.name ?? ""} role={session.user.role} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
