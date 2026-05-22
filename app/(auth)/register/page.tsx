import type { Metadata } from "next"
import Image from "next/image"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import RegisterForm from "./RegisterForm"

export const metadata: Metadata = { title: "Crear usuario" }

export default async function RegisterPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard")

  const clinics = await prisma.clinic.findMany({ orderBy: { name: "asc" } })

  return (
    <div className="min-h-screen bg-salvia-700 flex items-center justify-center px-4">
      <div className="w-full max-w-[460px]">
        <div className="flex justify-center mb-8">
          <Image src="/logos/pets-lab-cream.png" alt="Pets & Lab" width={180} height={70} className="object-contain" />
        </div>
        <div className="bg-bone p-8">
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-1">Administración</p>
          <h1 className="font-serif text-[26px] font-medium tracking-[-0.02em] mb-6">Crear usuario</h1>
          <RegisterForm clinics={clinics} />
        </div>
      </div>
    </div>
  )
}
