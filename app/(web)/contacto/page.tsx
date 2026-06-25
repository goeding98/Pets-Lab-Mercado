import type { Metadata } from "next"
import Eyebrow from "@/components/Eyebrow"
import Btn from "@/components/Btn"
import { SITE } from "@/lib/site-config"

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Contacta con Pets & Lab en Cali. WhatsApp, dirección y horario de atención del laboratorio veterinario.",
}

const CONTACT_ITEMS = [
  { label: "Dirección", value: SITE.address, href: undefined },
  { label: "WhatsApp", value: SITE.phone, href: SITE.whatsapp },
  { label: "Instagram", value: SITE.instagram, href: SITE.instagramUrl },
  { label: "Horario", value: SITE.hours, href: undefined },
]

export default function ContactoPage() {
  return (
    <>
      <section className="max-w-wrap mx-auto px-6 lg:px-10 py-14 md:py-16">
        <Eyebrow>Contacto</Eyebrow>
        <h1 className="font-serif text-[48px] md:text-[60px] lg:text-[66px] leading-[0.95] tracking-[-0.04em] font-medium mt-4">
          Hablemos.
        </h1>
      </section>

      <section className="max-w-wrap mx-auto px-6 lg:px-10 pb-14 grid md:grid-cols-[1fr_1.2fr] gap-9">
        <div>
          {CONTACT_ITEMS.map(({ label, value, href }) => (
            <div key={label} className="pb-4 mb-4 border-b border-black/10">
              <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">{label}</p>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-serif text-[20px] md:text-[22px] font-medium tracking-[-0.01em] mt-1.5 block hover:text-salvia-700 transition-colors"
                >
                  {value}
                </a>
              ) : (
                <p className="font-serif text-[20px] md:text-[22px] font-medium tracking-[-0.01em] mt-1.5">
                  {value}
                </p>
              )}
            </div>
          ))}
          <div className="mt-2">
            <Btn href={SITE.whatsapp}>Escríbenos por WhatsApp →</Btn>
          </div>
        </div>

        {/* Mapa estilizado */}
        <div className="bg-salvia-50 border border-black/[0.08] overflow-hidden min-h-[400px] md:min-h-[460px]">
          <svg
            viewBox="0 0 400 460"
            className="w-full h-full"
            aria-label="Mapa de ubicación — Cl. 10 #31-143, Cali"
            role="img"
          >
            <rect width="400" height="460" fill="#eef2ee" />
            <g stroke="rgba(94,112,100,.25)" strokeWidth="1.2" fill="none">
              <line x1="0" y1="80" x2="400" y2="100" />
              <line x1="0" y1="180" x2="400" y2="170" />
              <line x1="0" y1="260" x2="400" y2="270" />
              <line x1="0" y1="340" x2="400" y2="330" />
              <line x1="40" y1="0" x2="60" y2="460" />
              <line x1="140" y1="0" x2="155" y2="460" />
              <line x1="240" y1="0" x2="225" y2="460" />
              <line x1="340" y1="0" x2="325" y2="460" />
            </g>
            <path d="M 0 230 Q 200 220 400 250" stroke="#5e7064" strokeWidth="3" fill="none" />
            <circle cx="200" cy="230" r="40" fill="#5e7064" fillOpacity="0.15" />
            <circle cx="200" cy="230" r="20" fill="#5e7064" fillOpacity="0.3" />
            <g transform="translate(190, 200)">
              <path d="M 10 50 L 0 30 a 10 10 0 1 1 20 0 Z" fill="#5e7064" />
              <circle cx="10" cy="22" r="4" fill="#faf6ee" />
            </g>
            <text
              x="200"
              y="290"
              textAnchor="middle"
              fontFamily="'JetBrains Mono', monospace"
              fontSize="9"
              letterSpacing="3"
              fill="#5e7064"
            >
              PETS &amp; LAB · CL. 10 #31-143
            </text>
          </svg>
        </div>
      </section>
    </>
  )
}
