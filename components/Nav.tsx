"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { SITE } from "@/lib/site-config"

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/servicios", label: "Servicios" },
  { href: "/veterinarios", label: "Veterinarios" },
  { href: "/resultados", label: "Resultados" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/contacto", label: "Contacto" },
]

export default function Nav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href)

  return (
    <header className="sticky top-0 z-50 bg-bone border-b border-ink/8">
      <div className="max-w-wrap mx-auto px-6 lg:px-10 flex items-center justify-between h-16 md:h-[72px]">
        <Link href="/" className="flex items-center shrink-0">
          <Image
            src="/logos/pets-lab-salvia.png"
            alt="Pets & Lab"
            width={120}
            height={36}
            className="h-9 w-auto"
            priority
          />
        </Link>

        <nav className="hidden md:flex items-center gap-6 lg:gap-7" aria-label="Principal">
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`font-sans text-[13px] tracking-tight pb-0.5 border-b-[1.5px] transition-colors ${
                isActive(href)
                  ? "text-ink font-medium border-salvia-700"
                  : "text-ink-2 border-transparent hover:text-ink"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-1 text-ink focus:outline-2 focus:outline-salvia-700"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              {open ? (
                <>
                  <path d="M18 6 6 18" />
                  <path d="M6 6 18 18" />
                </>
              ) : (
                <>
                  <path d="M4 6h16" />
                  <path d="M4 12h16" />
                  <path d="M4 18h16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-bone border-t border-ink/8 px-6 pb-6 pt-4">
          <nav className="flex flex-col gap-1" aria-label="Móvil">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`font-sans text-sm py-2.5 border-b border-black/6 ${
                  isActive(href) ? "text-salvia-700 font-medium" : "text-ink-2"
                }`}
              >
                {label}
              </Link>
            ))}
            <a
              href={SITE.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 font-mono text-[10px] tracking-[0.22em] uppercase bg-salvia-700 text-bone px-4 py-3 text-center block"
            >
              WhatsApp ↗
            </a>
          </nav>
        </div>
      )}
    </header>
  )
}
