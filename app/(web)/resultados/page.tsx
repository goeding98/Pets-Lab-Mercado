import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import ClinicLoginForm from "./ClinicLoginForm"

export const metadata: Metadata = { title: "Portal de resultados" }

export default async function ResultadosPage() {
  const session = await getServerSession(authOptions)
  if (session?.user.role === "CLINIC") redirect("/resultados/dashboard")

  return (
    <section className="max-w-wrap mx-auto px-6 lg:px-10 py-16 md:py-24 grid md:grid-cols-2 gap-14 items-center min-h-[560px]">
      <div>
        <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-3">
          Portal de clínicas
        </p>
        <h1 className="font-serif text-[48px] md:text-[58px] leading-[0.95] tracking-[-0.04em] font-medium mb-5">
          Consulta tus<br />
          <em className="italic font-normal text-salvia-500">resultados.</em>
        </h1>
        <p className="font-sans text-sm text-ink-2 max-w-[400px] leading-[1.6]">
          Accede con el nombre de tu clínica y la contraseña asignada. Encuentra aquí todas tus
          muestras recibidas y los resultados listos para descargar.
        </p>
      </div>

      <div className="bg-white border border-black/[0.08] p-8">
        <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-1">
          Acceso de clínicas
        </p>
        <h2 className="font-serif text-[24px] font-medium tracking-[-0.02em] mb-6">
          Iniciar sesión
        </h2>
        <ClinicLoginForm />
      </div>
    </section>
  )
}
