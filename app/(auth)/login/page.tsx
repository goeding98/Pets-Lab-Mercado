import type { Metadata } from "next"
import Image from "next/image"
import LoginForm from "./LoginForm"

export const metadata: Metadata = { title: "Iniciar sesión" }

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-salvia-700 flex items-center justify-center px-4">
      <div className="w-full max-w-[420px]">
        <div className="flex justify-center mb-8">
          <Image
            src="/logos/pets-lab-cream.png"
            alt="Pets & Lab"
            width={180}
            height={70}
            className="object-contain"
          />
        </div>
        <div className="bg-bone p-8">
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-1">Sistema LIMS</p>
          <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mb-6">Iniciar sesión</h1>
          <LoginForm />
        </div>
        <p className="text-center font-mono text-[9px] tracking-[0.18em] text-bone/50 mt-6 uppercase">
          Pets &amp; Lab · Acceso restringido
        </p>
      </div>
    </div>
  )
}
