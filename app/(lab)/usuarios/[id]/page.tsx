import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect, notFound } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import EditUserForm from "./EditUserForm"

export const metadata: Metadata = { title: "Editar usuario" }

export default async function EditUserPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== "ADMIN") redirect("/dashboard")

  const user = await prisma.user.findUnique({ where: { id: params.id } })
  if (!user) notFound()

  return (
    <div className="px-8 py-8 max-w-xl">
      <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Administración</p>
      <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1 mb-6">Editar usuario</h1>
      <EditUserForm user={{ id: user.id, name: user.name, email: user.email, role: user.role }} isSelf={session.user.id === user.id} />
    </div>
  )
}
