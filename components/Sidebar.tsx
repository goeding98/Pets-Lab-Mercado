"use client"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

const NAV = [
  { href: "/dashboard", label: "Panel" },
  { href: "/muestras", label: "Muestras" },
  { href: "/muestras/nueva", label: "Nueva muestra" },
  { href: "/clientes", label: "Clientes" },
  { href: "/usuarios", label: "Usuarios" },
  { href: "/inventario", label: "Inventario" },
]

export default function Sidebar({ userName, role }: { userName: string; role: string }) {
  const path = usePathname()

  return (
    <aside className="w-56 min-h-screen bg-salvia-700 flex flex-col shrink-0">
      <div className="px-6 pt-6 pb-4 border-b border-bone/10">
        <Image
          src="/logos/pets-lab-cream.png"
          alt="Pets & Lab"
          width={130}
          height={50}
          className="object-contain"
        />
        <p className="font-mono text-[8px] tracking-[0.18em] text-bone/50 mt-2 uppercase">LIMS</p>
      </div>

      <nav className="flex-1 py-4">
        {NAV.map(({ href, label }) => {
          const active = path === href || (href !== "/dashboard" && path.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={`block px-6 py-2.5 font-sans text-sm transition-colors ${
                active ? "bg-bone/10 text-bone" : "text-bone/70 hover:text-bone hover:bg-bone/5"
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-6 pb-6 border-t border-bone/10 pt-4">
        <p className="font-sans text-xs text-bone/70 truncate">{userName}</p>
        <p className="font-mono text-[8px] tracking-[0.18em] text-salvia-300 uppercase mt-0.5">{role}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="mt-3 font-mono text-[9px] tracking-[0.18em] text-bone/50 hover:text-bone uppercase transition-colors"
        >
          Cerrar sesión →
        </button>
      </div>
    </aside>
  )
}
