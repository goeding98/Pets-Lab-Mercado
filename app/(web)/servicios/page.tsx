import type { Metadata } from "next"
import Eyebrow from "@/components/Eyebrow"
import Btn from "@/components/Btn"
import { IconDrop, IconTube, IconSlide, IconFlask, IconClipboard, IconHeart } from "@/components/icons"
import { SITE } from "@/lib/site-config"
import { prisma } from "@/lib/db"

export const metadata: Metadata = {
  title: "Servicios",
  description:
    "Catálogo de exámenes veterinarios en Cali: perfiles, hematología, química sanguínea, urianálisis, coproparasitología, dermatología, endocrinología, microbiología, serología, histopatología y PCR.",
}

// El catálogo se lee de la base (los mismos exámenes activos que se ofrecen en Nueva muestra y el
// Portal Vet), así esta página no se desactualiza. Se regenera cada 10 min o al cambiar Promociones.
export const revalidate = 600

const ICONS = { drop: IconDrop, tube: IconTube, slide: IconSlide, flask: IconFlask, clipboard: IconClipboard, heart: IconHeart }
type IconName = keyof typeof ICONS

// Orden y presentación de cada área; un área nueva del catálogo sale al final con el ícono genérico
const AREAS: { area: string; icon: IconName }[] = [
  { area: "Promociones", icon: "heart" },
  { area: "Perfiles", icon: "clipboard" },
  { area: "Hematología", icon: "drop" },
  { area: "Química Sanguínea", icon: "tube" },
  { area: "Urianálisis", icon: "flask" },
  { area: "Coproparasitología", icon: "clipboard" },
  { area: "Dermatología", icon: "slide" },
  { area: "Endocrinología", icon: "tube" },
  { area: "Microbiología", icon: "flask" },
  { area: "Inmunología / Serología", icon: "heart" },
  { area: "Histología e Histopatología", icon: "slide" },
  { area: "PCR Veterinaria", icon: "drop" },
]
const COLORS = ["#5e7064", "#2a7780"]

// "Química Sanguínea" → "quimica-sanguinea" (anclas del índice y del footer)
const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

export default async function ServiciosPage() {
  const templates = await prisma.examTemplate.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, area: true, turnaround: true, sampleType: true, description: true },
  })

  const known = AREAS.map(a => a.area)
  const groups = [
    ...AREAS,
    ...Array.from(new Set(templates.map(t => t.area)))
      .filter(a => !known.includes(a))
      .sort()
      .map(area => ({ area, icon: "flask" as IconName })),
  ]
    .map(g => ({ ...g, id: slug(g.area), items: templates.filter(t => t.area === g.area) }))
    .filter(g => g.items.length > 0)

  return (
    <>
      <section className="max-w-wrap mx-auto px-6 lg:px-10 py-14 md:py-16">
        <Eyebrow>Catálogo</Eyebrow>
        <h1 className="font-serif text-[48px] md:text-[60px] font-medium tracking-[-0.03em] leading-none mt-4 mb-3">
          Servicios.
        </h1>
        <p className="font-sans text-sm text-ink-2 max-w-[540px] leading-[1.55]">
          {templates.length} pruebas y perfiles disponibles por área. Tiempos aproximados desde la recepción de
          la muestra. Para perfiles personalizados, escríbenos por WhatsApp.
        </p>
        <nav className="flex flex-wrap gap-2 mt-6">
          {groups.map(g => (
            <a
              key={g.id}
              href={`#${g.id}`}
              className="font-mono text-[9px] tracking-[0.15em] uppercase border border-black/15 px-3 py-1.5 text-ink-2 hover:text-ink hover:bg-black/[0.03] transition-colors"
            >
              {g.area} · {g.items.length}
            </a>
          ))}
        </nav>
      </section>

      {/* Columnas (no grid) para que las áreas largas y cortas no dejen huecos */}
      <section className="max-w-wrap mx-auto px-6 lg:px-10 pb-14 md:columns-2 gap-4">
        {groups.map((g, i) => {
          const Icon = ICONS[g.icon]
          const color = COLORS[i % COLORS.length]
          return (
            <div key={g.id} id={g.id} className="border border-black/10 bg-bone p-7 mb-4 break-inside-avoid scroll-mt-24">
              <div className="flex items-center gap-3 pb-4 mb-4" style={{ borderBottom: `1px solid ${color}` }}>
                <Icon size={28} color={color} />
                <p className="font-serif text-2xl font-medium tracking-[-0.01em]">{g.area}</p>
                <span className="flex-1" />
                <span className="font-mono text-[9px] tracking-[0.18em]" style={{ color }}>
                  {g.items.length} {g.items.length === 1 ? "PRUEBA" : "PRUEBAS"}
                </span>
              </div>
              <ul className="space-y-2.5">
                {g.items.map(t => (
                  <li key={t.id}>
                    <p className="font-sans text-[13px] text-ink leading-snug">{t.name}</p>
                    {t.description && (
                      <p className="font-sans text-[12px] text-ink-2 leading-snug mt-0.5">Incluye: {t.description}</p>
                    )}
                    <p className="font-mono text-[9px] tracking-[0.12em] text-ink-2 opacity-70 mt-0.5">
                      {t.turnaround.toUpperCase()} · {t.sampleType.toUpperCase()}
                    </p>
                  </li>
                ))}
              </ul>
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
