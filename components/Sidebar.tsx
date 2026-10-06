"use client"
import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import { can, ROLE_LABELS, type Permission } from "@/lib/permissions"

const NAV: { href: string; label: string; perm: Permission }[] = [
  { href: "/dashboard", label: "Panel", perm: "panel" },
  { href: "/muestras", label: "Muestras", perm: "muestras.ver" },
  { href: "/muestras/nueva", label: "Nueva muestra", perm: "muestras.crear" },
  { href: "/clientes", label: "Clientes", perm: "clientes.ver" },
  { href: "/promociones", label: "Promociones", perm: "promociones" },
  { href: "/personalizados", label: "Personalizados", perm: "promociones" },
  { href: "/rangos", label: "Rangos de referencia", perm: "rangos" },
  { href: "/usuarios", label: "Usuarios", perm: "usuarios" },
  { href: "/caja", label: "Caja", perm: "caja" },
  { href: "/inventario", label: "Inventario", perm: "inventario" },
]

// Ruta activa: la más específica que coincida ("/muestras/nueva" no marca también "/muestras")
function activeHref(path: string, hrefs: string[]) {
  return hrefs
    .filter(h => path === h || (h !== "/dashboard" && path.startsWith(h + "/")))
    .sort((a, b) => b.length - a.length)[0]
}

function NavContent({ userName, role, path }: { userName: string; role: string; path: string }) {
  const items = NAV.filter(({ perm }) => can(role, perm))
  const current = activeHref(path, items.map(i => i.href))
  return (
    <>
      <nav className="flex-1 py-4">
        {items.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`block px-6 py-3 md:py-2.5 font-sans text-[15px] md:text-sm transition-colors ${
              href === current ? "bg-bone/10 text-bone" : "text-bone/70 hover:text-bone hover:bg-bone/5"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="px-6 pb-6 border-t border-bone/10 pt-4">
        <p className="font-sans text-xs text-bone/70 truncate">{userName}</p>
        <p className="font-mono text-[8px] tracking-[0.18em] text-salvia-300 uppercase mt-0.5">{ROLE_LABELS[role] ?? role}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-3 py-1 font-mono text-[9px] tracking-[0.18em] text-bone/50 hover:text-bone uppercase transition-colors"
        >
          Cerrar sesión →
        </button>
      </div>
    </>
  )
}

export default function Sidebar({ userName, role }: { userName: string; role: string }) {
  const path = usePathname()
  const [open, setOpen] = useState(false)

  // Al navegar se cierra el menú del celular
  useEffect(() => setOpen(false), [path])

  // Con el menú abierto no se desplaza la página de fondo
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  const current = NAV.find(n => n.href === activeHref(path, NAV.map(i => i.href)))

  return (
    <>
      {/* Celular: barra superior fija con el botón del menú */}
      <header className="md:hidden sticky top-0 z-30 bg-salvia-700 flex items-center justify-between px-4 h-14 shadow-sm">
        <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
          <Image src="/logos/pets-lab-cream.png" alt="Pets & Lab" width={92} height={35} className="object-contain shrink-0" />
          {current && (
            <span className="font-mono text-[9px] tracking-[0.18em] text-bone/60 uppercase truncate">{current.label}</span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="w-11 h-11 -mr-2 flex items-center justify-center text-bone"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </header>

      {/* Celular: menú desplegable */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <button type="button" aria-label="Cerrar menú" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/40" />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-salvia-700 flex flex-col shadow-xl overflow-y-auto">
            <div className="px-6 h-14 flex items-center justify-between border-b border-bone/10 shrink-0">
              <Image src="/logos/pets-lab-cream.png" alt="Pets & Lab" width={92} height={35} className="object-contain" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="w-11 h-11 -mr-3 flex items-center justify-center text-bone/80 hover:text-bone"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <NavContent userName={userName} role={role} path={path} />
          </aside>
        </div>
      )}

      {/* Computador: barra lateral de siempre */}
      <aside className="hidden md:flex w-56 min-h-screen bg-salvia-700 flex-col shrink-0">
        <div className="px-6 pt-6 pb-4 border-b border-bone/10">
          <Image src="/logos/pets-lab-cream.png" alt="Pets & Lab" width={130} height={50} className="object-contain" />
          <p className="font-mono text-[8px] tracking-[0.18em] text-bone/50 mt-2 uppercase">LIMS</p>
        </div>
        <NavContent userName={userName} role={role} path={path} />
      </aside>
    </>
  )
}
