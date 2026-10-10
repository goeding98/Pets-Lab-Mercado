"use client"
import { useState, useTransition } from "react"
import { createClinic, updateClinic } from "@/actions/clinics"
import type { Clinic } from "@prisma/client"

export default function ClinicaForm({ clinic, canSetNoCharge = false }: { clinic?: Clinic; canSetNoCharge?: boolean }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const isEdit = !!clinic

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError("")
    startTransition(async () => {
      const res = await (isEdit ? updateClinic(clinic.id, fd) : createClinic(fd))
      if (res?.error) setError(res.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <fieldset className="border border-black/10 p-5">
        <legend className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase px-1">
          Datos de la clínica
        </legend>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div className="col-span-2">
            <Label>Nombre de la clínica *</Label>
            <Input name="name" required defaultValue={clinic?.name} placeholder="Ej. Clínica Veterinaria El Bosque" />
          </div>
          <div>
            <Label>NIT</Label>
            <Input name="nit" defaultValue={clinic?.nit ?? ""} placeholder="Ej. 900.123.456-7" />
          </div>
          <div>
            <Label>WhatsApp / celular{isEdit ? "" : " *"}</Label>
            <Input name="phone" type="tel" required={!isEdit} defaultValue={clinic?.phone ?? ""} placeholder="Ej. 310 780 0332" />
          </div>
          <div className="col-span-2">
            <Label>Email{isEdit ? "" : " *"}</Label>
            <Input name="email" type="email" required={!isEdit} defaultValue={clinic?.email ?? ""} placeholder="Ej. contacto@clinica.com" />
            {!isEdit && (
              <p className="font-sans text-[11px] text-ink-2 mt-1">
                Se le crea la cuenta del Portal Vet: entra con este correo y la clave <strong>123456789</strong>.
              </p>
            )}
          </div>
          <div className="col-span-2">
            <Label>Correo de facturación</Label>
            <Input name="billingEmail" type="email" defaultValue={clinic?.billingEmail ?? clinic?.email ?? ""} placeholder="Si se deja vacío, se usa el correo de arriba" />
            <p className="font-sans text-[11px] text-ink-2 mt-1">A este correo llegan las facturas (Siigo).</p>
          </div>
          <div className="col-span-2">
            <Label>Persona de contacto</Label>
            <Input name="contactName" defaultValue={clinic?.contactName ?? ""} placeholder="Nombre y apellido" />
          </div>
          <div className="col-span-2">
            <Label>Dirección</Label>
            <Input name="address" defaultValue={clinic?.address ?? ""} placeholder="Ej. Cra 5 #20-30" />
          </div>
          <div>
            <Label>Barrio</Label>
            <Input name="neighborhood" defaultValue={clinic?.neighborhood ?? ""} placeholder="Ej. San Fernando" />
          </div>
          <div>
            <Label>Ciudad</Label>
            <Input name="city" defaultValue={clinic?.city ?? ""} placeholder="Ej. Cali" />
          </div>
          {canSetNoCharge && (
          <label className="col-span-2 flex items-start gap-2 font-sans text-sm text-ink cursor-pointer">
            <input type="checkbox" name="noCharge" value="1" defaultChecked={clinic?.noCharge ?? false} className="mt-1 w-4 h-4 accent-salvia-700" />
            <span>
              Cliente sin cobro
              <span className="block text-[11px] text-ink-2">Sus resultados se entregan siempre, sin esperar pago (ej. Pets &amp; Pets).</span>
            </span>
          </label>
          )}
        </div>
      </fieldset>

      {error && <p className="font-sans text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.22em] uppercase px-6 py-3 hover:bg-salvia-800 transition-colors disabled:opacity-60"
      >
        {pending ? "Guardando…" : isEdit ? "Guardar cambios →" : "Crear clínica →"}
      </button>
    </form>
  )
}

const inputClass =
  "w-full border border-black/20 bg-white px-3 py-2 text-sm font-sans focus:outline-2 focus:outline-salvia-700 focus:outline-offset-0"

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block font-mono text-[9px] tracking-[0.18em] uppercase text-salvia-700 mb-1.5">
      {children}
    </label>
  )
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />
}
