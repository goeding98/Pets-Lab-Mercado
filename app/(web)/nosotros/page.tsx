import type { Metadata } from "next"
import Image from "next/image"
import Eyebrow from "@/components/Eyebrow"

export const metadata: Metadata = {
  title: "Nosotros",
  description:
    "Historia, valores y equipo de Pets & Lab — el laboratorio veterinario de Pets & Pets en Cali.",
}

const VALUES = [
  ["Precisión", "Doble revisión en hematología y citología. Equipos calibrados mes a mes."],
  ["Respeto", "Resultados explicados sin tecnicismos cuando hace falta. Tiempo para preguntas."],
  ["Cercanía", "WhatsApp directo. No hay menús ni filas. Atendemos personas."],
] as const

const TEAM: { name: string; role: string; title: string; photo?: string }[] = [
  { name: "Dr. Marcelo Valencia", role: "Director del Laboratorio", title: "Médico Veterinario · Esp. Laboratorio Clínico" },
  { name: "Anderson Valencia", role: "Analista del Laboratorio", title: "Microbiólogo", photo: "/team/anderson-valencia.jpg" },
  { name: "Dr. Jacobo Hernández", role: "Líder Comercial", title: "Médico Veterinario", photo: "/team/jacobo-hernandez.jpg" },
  { name: "Juan Carlos Vélez", role: "Líder de Mensajería", title: "", photo: "/team/juan-carlos-velez.jpg" },
]

export default function NosotrosPage() {
  return (
    <>
      <section className="max-w-wrap mx-auto px-6 lg:px-10 py-14 md:py-16">
        <Eyebrow>Quiénes somos</Eyebrow>
        <h1 className="font-serif text-[48px] md:text-[60px] lg:text-[66px] leading-[0.95] tracking-[-0.04em] font-medium mt-4 max-w-[700px]">
          Una extensión del{" "}
          <em className="italic text-salvia-500">cuidado</em> de Pets &amp; Pets.
        </h1>
      </section>

      {/* Historia */}
      <section className="max-w-wrap mx-auto px-6 lg:px-10 pb-14 grid md:grid-cols-[1fr_1.4fr] gap-10">
        <div className="bg-salvia-300 aspect-square flex items-center justify-center">
          <Image
            src="/logos/pets-lab-salvia.png"
            alt="Pets & Lab"
            width={200}
            height={200}
            className="w-[60%] object-contain"
          />
        </div>
        <div className="font-sans text-sm text-ink-2 leading-[1.7]">
          Pets &amp; Lab nace en 2026 como el área de diagnóstico de la clínica veterinaria{" "}
          <strong className="text-ink">Pets &amp; Pets</strong>, una marca caleña con años de
          experiencia en medicina de animales de compañía.
          <br /><br />
          Atendemos a colegas veterinarios y tutores particulares en Cali y el Valle del Cauca.
          Nuestra propuesta es simple:{" "}
          <strong className="text-ink">
            resultados confiables, tiempos razonables, explicaciones respetuosas
          </strong>.
          <br /><br />
          Trabajamos con equipos calibrados mensualmente, doble revisión en hematología y citología,
          y un sistema de reporte digital seguro. Cuando entras a Pets &amp; Lab, encuentras a las
          mismas personas que ya conocías — ahora en bata.
        </div>
      </section>

      {/* Valores */}
      <section className="bg-salvia-50 py-14">
        <div className="max-w-wrap mx-auto px-6 lg:px-10">
          <Eyebrow>Valores</Eyebrow>
          <div className="grid md:grid-cols-3 gap-6 mt-6">
            {VALUES.map(([t, d]) => (
              <div key={t}>
                <p className="font-serif text-[26px] font-medium tracking-[-0.02em]">{t}.</p>
                <p className="font-sans text-sm text-ink-2 mt-2 leading-[1.6] max-w-[280px]">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Equipo */}
      <section className="max-w-wrap mx-auto px-6 lg:px-10 py-14">
        <Eyebrow>Equipo</Eyebrow>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-6">
          {TEAM.map((m) => (
            <div key={m.name}>
              <div className="aspect-[3/4] bg-salvia-300 mb-3 relative overflow-hidden">
                {m.photo ? (
                  <Image src={m.photo} alt={m.name} fill className="object-cover object-top" />
                ) : (
                  <span className="absolute top-4 left-4 font-mono text-[9px] tracking-[0.22em] text-salvia-700">FOTO</span>
                )}
              </div>
              <p className="font-serif text-[17px] font-medium tracking-[-0.01em]">{m.name}</p>
              <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 mt-1 uppercase">{m.role}</p>
              {m.title && (
                <p className="font-sans text-[11px] text-ink-2 mt-0.5 leading-[1.4]">{m.title}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
