import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import Link from "next/link"
import UserRowActions from "./UserRowActions"

export const metadata: Metadata = { title: "Usuarios" }

export default async function UsuariosPage() {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== "ADMIN") redirect("/dashboard")

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { clinic: true },
  })

  return (
    <div className="px-8 py-8 max-w-4xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Administración</p>
          <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">Usuarios</h1>
        </div>
        <Link
          href="/register"
          className="bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.22em] uppercase px-5 py-3 hover:bg-salvia-800 transition-colors"
        >
          Nuevo usuario +
        </Link>
      </div>

      <div className="border border-black/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-salvia-50 border-b border-black/10">
              {["Nombre", "Email", "Rol", "Clínica", "Creado", ""].map(h => (
                <th key={h} className="text-left px-4 py-2.5 font-mono text-[8px] tracking-[0.18em] uppercase text-salvia-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr key={user.id} className={`border-b border-black/[0.06] ${i % 2 !== 0 ? "bg-black/[0.015]" : ""}`}>
                <td className="px-4 py-3 font-sans text-sm font-medium">{user.name}</td>
                <td className="px-4 py-3 font-mono text-[11px] text-ink-2">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`font-mono text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 ${
                    user.role === "ADMIN" ? "bg-ink text-bone" :
                    user.role === "STAFF" ? "bg-salvia-700 text-bone" :
                    "bg-azul-100 text-azul-800"
                  }`}>{user.role}</span>
                </td>
                <td className="px-4 py-3 font-sans text-xs text-ink-2">{user.clinic?.name ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-[10px] text-ink-2">
                  {new Date(user.createdAt).toLocaleDateString("es-CO")}
                </td>
                <td className="px-4 py-3">
                  <UserRowActions userId={user.id} isSelf={session!.user.id === user.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
