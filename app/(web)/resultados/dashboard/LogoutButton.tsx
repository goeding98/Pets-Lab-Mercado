"use client"

import { signOut } from "next-auth/react"

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/resultados" })}
      className="font-mono text-[9px] tracking-[0.18em] text-ink-2 hover:text-ink uppercase border border-black/15 px-3 py-2 hover:bg-black/[0.03] transition-colors"
    >
      Cerrar sesión
    </button>
  )
}
