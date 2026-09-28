import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import PortalAccess from "./PortalAccess"

export const metadata: Metadata = { title: "Portal Vet" }

export default async function PortalVetPage() {
  const session = await getServerSession(authOptions)
  if (session?.user.role === "CLINIC") redirect("/portal-vet/dashboard")

  return (
    <section className="max-w-wrap mx-auto px-6 lg:px-10 py-16 md:py-24 grid md:grid-cols-2 gap-14 items-start min-h-[560px]">
      <div className="md:pt-10">
        <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-3">
          Portal Vet · Clínicas veterinarias
        </p>
        <h1 className="font-serif text-[48px] md:text-[58px] leading-[0.95] tracking-[-0.04em] font-medium mb-5">
          Solicita exámenes<br />
          <em className="italic font-normal text-salvia-500">y recibe resultados.</em>
        </h1>
        <p className="font-sans text-sm text-ink-2 max-w-[420px] leading-[1.6] mb-8">
          Registra tu clínica una sola vez. Desde el portal cargas cada solicitud con los datos del
          paciente, sigues su estado y descargas los resultados en PDF.
        </p>
        <ol className="space-y-3 max-w-[420px]">
          {[
            "Crea la cuenta de tu clínica.",
            "Carga la solicitud: paciente y exámenes.",
            "Envía la muestra al laboratorio.",
            "Descarga el resultado cuando esté listo.",
          ].map((step, i) => (
            <li key={step} className="flex items-baseline gap-3 font-sans text-sm text-ink">
              <span className="font-mono text-[10px] text-salvia-700">0{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <PortalAccess />
    </section>
  )
}
