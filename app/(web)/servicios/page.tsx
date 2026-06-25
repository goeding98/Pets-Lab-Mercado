import type { Metadata } from "next"
import Eyebrow from "@/components/Eyebrow"
import Btn from "@/components/Btn"
import { IconDrop, IconTube, IconSlide, IconFlask, IconClipboard, IconHeart } from "@/components/icons"
import { SITE } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "Servicios",
  description:
    "Catálogo de exámenes veterinarios en Cali: hematología, bioquímica, citología, uroanálisis, coprología y más.",
}

const ICONS = { drop: IconDrop, tube: IconTube, slide: IconSlide, flask: IconFlask, clipboard: IconClipboard, heart: IconHeart }

const SERVICES = [
  {
    icon: "drop" as const,
    area: "Hematología",
    id: "hematologia",
    colorHex: "#5e7064",
    items: ["Hemograma completo", "Hemograma control hospitalario", "Recuento de plaquetas", "Recuento de reticulocitos", "Hematocrito", "Test rápido FIV/FeLV"],
    time: "Mismo día",
    sample: "Sangre · 1 mL EDTA",
  },
  {
    icon: "tube" as const,
    area: "Bioquímica",
    id: "bioquimica",
    colorHex: "#2a7780",
    items: ["Perfil básico", "Perfil prequirúrgico", "Perfil hepático", "Perfil renal + electrolitos", "Perfil geriátrico", "Perfil diabético", "Perfil gato adulto"],
    time: "24 horas",
    sample: "Sangre · 2 mL tubo seco",
  },
  {
    icon: "slide" as const,
    area: "Citología",
    id: "citologia",
    colorHex: "#5e7064",
    items: ["Citología diagnóstica", "Citología vaginal reproductiva", "Citología de oído", "Coloración Gram", "Coloración Wright"],
    time: "48 horas",
    sample: "Placa fijada",
  },
  {
    icon: "flask" as const,
    area: "Uroanálisis",
    id: "urinario",
    colorHex: "#2a7780",
    items: ["Parcial de orina (uroanálisis)", "Relación UPC"],
    time: "Mismo día",
    sample: "Orina fresca · 5 mL",
  },
  {
    icon: "clipboard" as const,
    area: "Coprología",
    id: "coprologia",
    colorHex: "#5e7064",
    items: ["Coprológico (flotación + directo)", "Coprológico seriado (3 muestras)", "Coproscópico"],
    time: "24–48 horas",
    sample: "Heces frescas",
  },
  {
    icon: "heart" as const,
    area: "Otros",
    id: "otros",
    colorHex: "#2a7780",
    items: ["Perfiles personalizados", "Pruebas externas referenciadas"],
    time: "A convenir",
    sample: "Según prueba",
  },
]

export default function ServiciosPage() {
  return (
    <>
      <section className="max-w-wrap mx-auto px-6 lg:px-10 py-14 md:py-16">
        <Eyebrow>Catálogo</Eyebrow>
        <h1 className="font-serif text-[48px] md:text-[60px] font-medium tracking-[-0.03em] leading-none mt-4 mb-3">
          Servicios.
        </h1>
        <p className="font-sans text-sm text-ink-2 max-w-[540px] leading-[1.55]">
          Lista de pruebas disponibles por área. Tiempos aproximados desde la recepción de la muestra.
          Para perfiles personalizados, escríbenos por WhatsApp.
        </p>
      </section>

      <section className="max-w-wrap mx-auto px-6 lg:px-10 pb-14 grid md:grid-cols-2 gap-4">
        {SERVICES.map((s) => {
          const Icon = ICONS[s.icon]
          return (
            <div key={s.id} id={s.id} className="border border-black/10 bg-bone p-7">
              <div
                className="flex items-center gap-3 pb-4 mb-4"
                style={{ borderBottom: `1px solid ${s.colorHex}` }}
              >
                <Icon size={28} color={s.colorHex} />
                <p className="font-serif text-2xl font-medium tracking-[-0.01em]">{s.area}</p>
                <span className="flex-1" />
                <span
                  className="font-mono text-[9px] tracking-[0.18em]"
                  style={{ color: s.colorHex }}
                >
                  {s.time}
                </span>
              </div>
              <div className="font-sans text-[12.5px] text-ink-2 leading-[1.85]">
                {s.items.map((it) => (
                  <p key={it}>· {it}</p>
                ))}
              </div>
              <p
                className="font-mono text-[9px] tracking-[0.18em] text-ink-2 mt-4 opacity-70"
              >
                MUESTRA · {s.sample.toUpperCase()}
              </p>
            </div>
          )
        })}
      </section>

      <section className="bg-salvia-700 text-bone py-11">
        <div className="max-w-wrap mx-auto px-6 lg:px-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <p className="font-serif text-[26px] md:text-[30px] font-medium tracking-[-0.02em]">
              ¿Necesitas un perfil personalizado?
            </p>
            <p className="font-sans text-sm mt-2 opacity-85">
              Nos cuentas el caso y armamos la combinación de pruebas.
            </p>
          </div>
          <Btn href={SITE.whatsapp} variant="outline-light">Hablemos por WhatsApp →</Btn>
        </div>
      </section>
    </>
  )
}
