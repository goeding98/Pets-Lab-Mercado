"use client"
import { useState, useTransition } from "react"
import { resetClinicPassword } from "@/actions/clinics"
import { DEFAULT_PORTAL_PASSWORD } from "@/lib/portalAccount"

// Acceso de la clínica al Portal Vet (para dárselo al veterinario) y restablecer su clave
export default function PortalAccess({ clinicId, login, canReset }: { clinicId: string; login: string | null; canReset: boolean }) {
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  if (!login) {
    return <p className="font-sans text-sm text-ink-2">Esta clínica no tiene cuenta en el Portal Vet.</p>
  }

  function reset() {
    if (!confirm(`¿Volver la clave del Portal Vet a ${DEFAULT_PORTAL_PASSWORD}?`)) return
    setMsg(null)
    startTransition(async () => {
      const res = await resetClinicPassword(clinicId)
      setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: `Clave restablecida a ${DEFAULT_PORTAL_PASSWORD}.` })
    })
  }

  return (
    <div className="border border-black/10 bg-white px-4 py-3">
      <p className="font-sans text-sm text-ink">
        Usuario: <strong className="font-mono text-[13px]">{login}</strong>
      </p>
      <p className="font-sans text-xs text-ink-2 mt-1">
        Entra en petslab.com.co → Portal Vet. Si se creó desde aquí, la clave inicial es <strong>{DEFAULT_PORTAL_PASSWORD}</strong>.
      </p>
      {canReset && (
        <button type="button" onClick={reset} disabled={pending}
          className="mt-2 font-mono text-[9px] tracking-[0.15em] uppercase text-salvia-700 hover:underline disabled:opacity-50">
          {pending ? "Restableciendo…" : `Restablecer clave a ${DEFAULT_PORTAL_PASSWORD}`}
        </button>
      )}
      {msg && <p className={`font-sans text-xs mt-1 ${msg.ok ? "text-salvia-700" : "text-red-600"}`}>{msg.text}</p>}
    </div>
  )
}
