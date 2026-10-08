"use client"
import { useState } from "react"
import { saveClinicPhone } from "@/actions/clinics"
import { toWhatsAppNumber } from "@/lib/whatsapp"

// Enviar el resultado por WhatsApp: abre wa.me con el número de la clínica (editable) y un mensaje con
// el enlace seguro al PDF (/r/<token>, ver lib/shareLink.ts). WhatsApp no deja adjuntar archivos
// desde un enlace, por eso va el link de descarga.
export default function WhatsAppButton({
  shareUrl, phone, clinicId, branchId, canSavePhone, greetingName, patientName, orderNumber, what, blockedReason, small = false,
}: {
  shareUrl: string
  phone: string | null
  clinicId: string | null
  branchId: string | null
  canSavePhone: boolean
  greetingName: string | null
  patientName: string
  orderNumber: string
  what: string // "los resultados" / "el resultado de Hemograma …"
  blockedReason?: string // ej. pendiente de pago
  small?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [number, setNumber] = useState(phone ?? "")
  const [save, setSave] = useState(!phone)
  const [error, setError] = useState("")
  const text =
    `Hola${greetingName ? ` ${greetingName.trim()}` : ""}, le saluda Pets & Lab. Le compartimos ${what} de *${patientName}* ` +
    `(orden ${orderNumber}). Puede verlo y descargarlo aquí:\n${shareUrl}\n\nCualquier inquietud, con gusto le ayudamos.`

  const btnClass = small
    ? "font-mono text-[9px] tracking-[0.18em] uppercase border border-[#1f9d55] text-[#1f7a43] px-3 py-1.5 hover:bg-[#1f9d55]/10 transition-colors"
    : "bg-[#1f9d55] text-white font-mono text-[10px] tracking-[0.18em] uppercase px-4 py-2.5 hover:bg-[#1a8549] transition-colors"

  if (blockedReason) {
    return (
      <span title={blockedReason} className={`${btnClass} opacity-40 cursor-not-allowed`}>
        WhatsApp
      </span>
    )
  }

  async function send() {
    setError("")
    const wa = number.trim() ? toWhatsAppNumber(number) : ""
    if (number.trim() && !wa) return setError("Revisa el número (ej. 310 780 0332).")
    // Se abre la pestaña de inmediato (si se espera al guardado, el navegador puede bloquearla)
    window.open(`https://wa.me/${wa ?? ""}?text=${encodeURIComponent(text)}`, "_blank", "noopener")
    if (wa && save && clinicId && canSavePhone && number.trim() !== (phone ?? "")) {
      await saveClinicPhone(clinicId, branchId, number).catch(() => {})
    }
    setOpen(false)
  }

  return (
    <span className="relative inline-block">
      <button type="button" onClick={() => setOpen(o => !o)} className={btnClass}>
        WhatsApp
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-40 w-[300px] max-w-[85vw] bg-bone border border-black/15 shadow-lg p-3 text-left">
          <label className="block font-mono text-[8px] tracking-[0.18em] uppercase text-ink-2 mb-1">WhatsApp de la clínica</label>
          <input
            value={number}
            onChange={e => setNumber(e.target.value)}
            placeholder="Ej. 310 780 0332"
            inputMode="tel"
            className="w-full border border-black/20 bg-white px-2 py-1.5 text-sm font-sans focus:outline-2 focus:outline-[#1f9d55]"
          />
          {!phone && (
            <p className="font-sans text-[11px] text-ink-2 mt-1">
              No hay número registrado. Escríbelo, o déjalo vacío para elegir el contacto en WhatsApp.
            </p>
          )}
          {clinicId && canSavePhone && number.trim() && number.trim() !== (phone ?? "") && (
            <label className="flex items-center gap-1.5 font-sans text-[11px] text-ink mt-1.5">
              <input type="checkbox" checked={save} onChange={e => setSave(e.target.checked)} className="accent-[#1f9d55]" />
              Guardar este número en la clínica
            </label>
          )}
          <p className="font-sans text-[11px] text-ink-2 bg-white border border-black/[0.06] px-2 py-1.5 mt-2 whitespace-pre-line max-h-32 overflow-y-auto">{text}</p>
          {error && <p className="font-sans text-xs text-red-600 mt-1">{error}</p>}
          <div className="flex gap-2 mt-2">
            <button type="button" onClick={send} className="bg-[#1f9d55] text-white font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 hover:bg-[#1a8549]">
              Abrir WhatsApp
            </button>
            <button type="button" onClick={() => setOpen(false)} className="border border-black/15 font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-1.5">
              Cancelar
            </button>
          </div>
          <p className="font-sans text-[10px] text-ink-2 mt-2">El enlace abre el PDF sin iniciar sesión y vence en 60 días.</p>
        </div>
      )}
    </span>
  )
}
