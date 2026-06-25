import type { Metadata } from "next"
import Image from "next/image"
import Eyebrow from "@/components/Eyebrow"
import Btn from "@/components/Btn"
import { SITE } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "Veterinarios",
  description:
    "Convenio para clínicas veterinarias en Cali. Recogida sin costo, resultados en 24h, reporte digital firmado. Sin costo de afiliación.",
}

const STEPS = [
  ["01", "Te afilias", "Llenamos un formulario corto. Sin costo de afiliación."],
  ["02", "Solicitas recogida", "Por WhatsApp, antes de las 11am del día."],
  ["03", "Pasamos por la muestra", "Mensajero designado en tu zona."],
  ["04", "Resultados 24h", "Reporte digital firmado, descargable."],
] as const

const BENEFITS = [
  ["Sin costo de afiliación", "No pagas mensualidad. Pagas por examen procesado."],
  ["Recogida programada", "Lunes a sábado, 7am – 4pm. Sin costo en Cali."],
  ["Reporte digital", "PDF firmado, descargable. Histórico por paciente."],
  ["Doble revisión", "Hematología y citología revisadas por dos profesionales."],
  ["Tarifas preferenciales", "Lista de precios para convenios."],
  ["Soporte directo", "Línea WhatsApp para resolver dudas técnicas."],
] as const

export default function VeterinariosPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-salvia-700 text-bone py-16 md:py-20">
        <div className="max-w-wrap mx-auto px-6 lg:px-10 grid md:grid-cols-[1.4fr_1fr] gap-10 items-center">
          <div>
            <Eyebrow color="#b6c5b9">Para veterinarios</Eyebrow>
            <h1 className="font-serif text-[52px] md:text-[68px] lg:text-[76px] leading-[0.95] tracking-[-0.04em] font-medium mt-4 mb-3">
              Tu laboratorio,<br />
              <em className="italic font-normal text-salvia-300">sin moverte de la clínica.</em>
            </h1>
            <p className="font-sans text-[15px] opacity-85 max-w-[480px] leading-[1.55]">
              Convenio para clínicas veterinarias en Cali. Recogida sin costo, resultados 24h, reporte
              digital firmado.
            </p>
            <div className="mt-7">
              <Btn href={SITE.whatsapp} variant="outline-light">Solicitar convenio</Btn>
            </div>
          </div>
          <div className="hidden md:flex justify-end">
            <Image
              src="/logos/pets-lab-cream.png"
              alt="Pets & Lab"
              width={300}
              height={300}
              className="w-[85%] object-contain opacity-80"
            />
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="max-w-wrap mx-auto px-6 lg:px-10 py-14">
        <Eyebrow>Cómo funciona</Eyebrow>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mt-6">
          {STEPS.map(([n, t, d]) => (
            <div key={n} className="border-t-2 border-salvia-700 pt-5">
              <p className="font-mono text-[11px] tracking-[0.22em] text-salvia-700">{n}</p>
              <p className="font-serif text-[20px] font-medium mt-2.5 tracking-[-0.01em]">{t}</p>
              <p className="font-sans text-xs text-ink-2 mt-1.5 leading-[1.5]">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Beneficios */}
      <section className="max-w-wrap mx-auto px-6 lg:px-10 pb-14">
        <Eyebrow>Beneficios</Eyebrow>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 mt-5">
          {BENEFITS.map(([t, d]) => (
            <div key={t} className="bg-salvia-50 p-5 md:p-6 border border-black/[0.06]">
              <p className="font-serif text-[17px] font-medium tracking-[-0.01em]">{t}</p>
              <p className="font-sans text-xs text-ink-2 mt-1.5 leading-[1.5]">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Clínicas aliadas */}
      <section className="bg-salvia-50 py-14">
        <div className="max-w-wrap mx-auto px-6 lg:px-10">
          <Eyebrow>Clínicas en convenio</Eyebrow>
          <p className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-3">
            +12 clínicas confían en Pets &amp; Lab.
          </p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="bg-bone h-[70px] flex items-center justify-center border border-black/[0.08]"
              >
                <span className="font-mono text-[9px] tracking-[0.18em] text-salvia-700">
                  CLÍNICA {String(i + 1).padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
