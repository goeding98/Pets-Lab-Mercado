"use client"
import { useTransition } from "react"
import { createClinic, updateClinic } from "@/actions/clinics"
import type { Clinic } from "@prisma/client"

export default function ClinicaForm({ clinic }: { clinic?: Clinic }) {
  const [pending, startTransition] = useTransition()
  const isEdit = !!clinic

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(() => isEdit ? updateClinic(clinic.id, fd) : createClinic(fd))
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
            <Label>Teléfono</Label>
            <Input name="phone" defaultValue={clinic?.phone ?? ""} placeholder="Ej. 602 123 4567" />
          </div>
          <div className="col-span-2">
            <Label>Email</Label>
            <Input name="email" type="email" defaultValue={clinic?.email ?? ""} placeholder="Ej. contacto@clinica.com" />
          </div>
          <div className="col-span-2">
            <Label>Dirección</Label>
            <Input name="address" defaultValue={clinic?.address ?? ""} placeholder="Ej. Cra 5 #20-30, Cali" />
          </div>
        </div>
      </fieldset>

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
