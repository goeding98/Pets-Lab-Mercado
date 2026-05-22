import type { Metadata } from "next"
import Image from "next/image"
import ConsultarForm from "./ConsultarForm"

export const metadata: Metadata = { title: "Consultar resultados" }

export default function ConsultarPage() {
  return (
    <div className="min-h-screen bg-salvia-700 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[460px]">
        <div className="flex justify-center mb-8">
          <Image src="/logos/pets-lab-cream.png" alt="Pets & Lab" width={180} height={70} className="object-contain" />
        </div>
        <div className="bg-bone p-8">
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-1">Portal de resultados</p>
          <h1 className="font-serif text-[26px] font-medium tracking-[-0.02em] mb-2">Consultar orden</h1>
          <p className="font-sans text-sm text-ink-2 mb-6 leading-relaxed">
            Ingresa el número de orden que tu veterinario te proporcionó para ver el estado de tus resultados.
          </p>
          <ConsultarForm />
        </div>
      </div>
    </div>
  )
}
