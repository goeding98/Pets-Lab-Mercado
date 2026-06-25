import type { Metadata } from "next"
import Image from "next/image"
import Eyebrow from "@/components/Eyebrow"
import Btn from "@/components/Btn"
import Newsletter from "@/components/Newsletter"
import { IconDrop, IconTube, IconSlide, IconFlask } from "@/components/icons"
import { SITE } from "@/lib/site-config"

export const metadata: Metadata = {
  title: { absolute: "Pets & Lab — Laboratorio veterinario en Cali" },
  description:
    "Hematología, bioquímica, citología y uroanálisis para clínicas veterinarias en Cali. Resultados en 24 horas, recogida sin costo.",
}

const STATS = [
  ["+1.200", "muestras / mes"],
  ["24h", "entrega promedio"],
  ["+30", "pruebas disponibles"],
  ["+12", "clínicas aliadas"],
] as const

const SERVICES_PREVIEW = [
  { Icon: IconDrop, title: "Hematología", desc: "Hemogramas, plaquetas, reticulocitos." },
  { Icon: IconTube, title: "Bioquímica", desc: "Perfiles renal, hepático, prequirúrgico." },
  { Icon: IconSlide, title: "Citología", desc: "Diagnóstica, oído, vaginal." },
  { Icon: IconFlask, title: "Uroanálisis", desc: "Parcial de orina, relación UPC." },
] as const

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="max-w-wrap mx-auto px-6 lg:px-10 pt-10 pb-0 md:pt-14 grid md:grid-cols-[1.3fr_1fr] gap-10 items-start">
        <div className="pt-2 pb-10 md:pb-14">
          <Eyebrow>Diagnóstico veterinario · Cali</Eyebrow>
          <h1 className="font-serif text-[48px] md:text-[60px] lg:text-[72px] leading-[0.98] tracking-[-0.04em] font-medium text-ink mt-4 mb-2">
            Resultados claros<br />
            <em className="italic font-normal text-salvia-500">para cuidados</em><br />
            mejores.
          </h1>
          <p className="font-sans text-sm text-ink-2 mt-5 max-w-[460px] leading-[1.55]">
            Somos el laboratorio de diagnóstico de Pets &amp; Pets. Hematología, bioquímica, citología y más — con la misma calidez que conoces, ahora en su forma más técnica.
          </p>
          <div className="flex flex-wrap gap-3 mt-7">
            <Btn href={SITE.whatsapp}>Soy veterinario →</Btn>
            <Btn href="/servicios" variant="outline">Ver servicios</Btn>
          </div>
        </div>
        {/* Imagen hero — foto de laboratorio con overlay + logo */}
        <div
          className="relative hidden md:block self-stretch min-h-[520px]"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1576086213369-97a306d36557?fit=crop&w=800&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center 30%",
          }}
        >
          {/* Overlay salvia semitransparente */}
          <div className="absolute inset-0 bg-salvia-700/70" />
          {/* Logo centrado */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="/logos/pets-lab-cream.png"
              alt="Pets & Lab"
              width={260}
              height={100}
              className="w-[58%] object-contain drop-shadow-lg"
            />
          </div>
          <p className="absolute bottom-3.5 left-3.5 font-mono text-[8px] tracking-[0.22em] text-bone/70 z-10">
            PETS &amp; LAB · ED. 2026
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-ink text-bone py-7">
        <div className="max-w-wrap mx-auto px-6 lg:px-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(([n, l]) => (
            <div key={l}>
              <p className="font-serif text-[38px] font-medium leading-none tracking-[-0.02em]">{n}</p>
              <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-300 mt-2 uppercase">{l}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dos rutas */}
      <section className="max-w-wrap mx-auto px-6 lg:px-10 py-14 grid md:grid-cols-2 gap-4">
        <div className="bg-salvia-700 text-bone p-10 flex flex-col justify-between min-h-[280px]">
          <div>
            <Eyebrow color="#faf6ee">Para veterinarios</Eyebrow>
            <p className="font-serif text-[26px] md:text-[30px] font-medium tracking-[-0.02em] leading-[1.1] mt-4 max-w-[340px]">
              Recogemos tus muestras en Cali, sin costo.
            </p>
            <p className="font-sans text-sm mt-4 opacity-90 max-w-[360px] leading-[1.55]">
              Convenio para clínicas. Entrega 24h en hematología y uroanálisis. Reporte digital al instante.
            </p>
          </div>
          <div className="mt-6">
            <Btn href="/veterinarios" variant="outline-light">Soy veterinario →</Btn>
          </div>
        </div>
        <div className="bg-azul-500 text-bone p-10 flex flex-col justify-between min-h-[280px]">
          <div>
            <Eyebrow color="#faf6ee">Para tutores</Eyebrow>
            <p className="font-serif text-[26px] md:text-[30px] font-medium tracking-[-0.02em] leading-[1.1] mt-4 max-w-[340px]">
              Tu mascota merece datos, no suposiciones.
            </p>
            <p className="font-sans text-sm mt-4 opacity-90 max-w-[360px] leading-[1.55]">
              Tu veterinario nos envía las muestras. Tú recibes resultados claros y bien explicados.
            </p>
          </div>
          <div className="mt-6">
            <Btn href="/servicios" variant="outline-light">Ver servicios</Btn>
          </div>
        </div>
      </section>

      {/* Quiénes somos */}
      <section className="max-w-wrap mx-auto px-6 lg:px-10 py-14 grid md:grid-cols-[1fr_1.4fr] gap-10">
        <div>
          <Eyebrow>Quiénes somos</Eyebrow>
          <h2 className="font-serif text-[28px] md:text-[36px] font-medium tracking-[-0.02em] leading-[1.05] mt-3">
            Una extensión del cuidado de{" "}
            <em className="italic text-salvia-700">Pets &amp; Pets</em>.
          </h2>
        </div>
        <div className="font-sans text-sm text-ink-2 leading-[1.7]">
          Pets &amp; Lab nace en 2026 como el área de diagnóstico de la clínica veterinaria Pets &amp; Pets.
          Atendemos a colegas veterinarios y tutores particulares en Cali y el Valle del Cauca con un compromiso
          simple:{" "}
          <strong className="text-ink">resultados confiables, en tiempos razonables, explicados con respeto</strong>.
          <br /><br />
          Trabajamos con equipos calibrados mensualmente, doble revisión en hematología y reporte digital
          seguro. Cuando entras a Pets &amp; Lab, encuentras a las mismas personas — ahora en bata.
        </div>
      </section>

      {/* Servicios preview */}
      <section className="max-w-wrap mx-auto px-6 lg:px-10 pb-14">
        <Eyebrow>Servicios</Eyebrow>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {SERVICES_PREVIEW.map(({ Icon, title, desc }) => (
            <div key={title} className="bg-salvia-50 p-5 md:p-6 border border-black/[0.06]">
              <Icon size={28} color="#5e7064" />
              <p className="font-serif text-[17px] font-medium mt-4 tracking-[-0.01em]">{title}</p>
              <p className="font-sans text-[11px] text-ink-2 mt-1.5 leading-[1.5]">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Clínicas aliadas */}
      <section className="bg-salvia-50 py-14">
        <div className="max-w-wrap mx-auto px-6 lg:px-10">
          <Eyebrow>Clínicas aliadas</Eyebrow>
          <p className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-3">
            Trabajamos con 12+ clínicas en Cali.
          </p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3.5 mt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-bone h-16 flex items-center justify-center border border-black/[0.08]"
              >
                <span className="font-mono text-[9px] tracking-[0.18em] text-salvia-700">LOGO {i + 1}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Newsletter />
    </>
  )
}
