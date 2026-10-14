"use client"

import { portalSignOut } from "@/lib/portalAuthClient"

export default function LogoutButton() {
  return (
    <button
      onClick={() => portalSignOut()}
      className="font-mono text-[9px] tracking-[0.18em] text-ink-2 hover:text-ink uppercase border border-black/15 px-3 py-2 hover:bg-black/[0.03] transition-colors"
    >
      Cerrar sesión
    </button>
  )
}
