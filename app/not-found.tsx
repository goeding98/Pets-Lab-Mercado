import Image from "next/image"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="min-h-screen bg-salvia-700 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[460px] text-center">
        <div className="flex justify-center mb-8">
          <Image src="/logos/pets-lab-cream.png" alt="Pets & Lab" width={180} height={70} className="object-contain" />
        </div>
        <div className="bg-bone px-8 py-10">
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-2">Error 404</p>
          <h1 className="font-serif text-[26px] font-medium tracking-[-0.02em] mb-3">Página no encontrada</h1>
          <p className="font-sans text-sm text-ink-2 mb-8 leading-relaxed">
            La dirección que buscas no existe o cambió de lugar.
          </p>
          <Link
            href="/"
            className="inline-block bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.22em] uppercase px-6 py-3 hover:bg-salvia-800 transition-colors"
          >
            Ir al inicio →
          </Link>
        </div>
      </div>
    </div>
  )
}
