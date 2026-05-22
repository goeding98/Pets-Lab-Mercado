"use client"
import { useTransition } from "react"
import { createOrder } from "@/actions/orders"
import type { ExamTemplate, Clinic } from "@prisma/client"

const AREAS = [
  "Hematología",
  "Coprología",
  "Citologías Reproductivas",
  "Uroanálisis",
  "Perfiles Química Sanguínea",
  "Citologías de Piel",
  "Química Sanguínea",
  "Otros",
]

export default function NuevaMuestraForm({
  templates,
  clinics,
}: {
  templates: ExamTemplate[]
  clinics: Clinic[]
}) {
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(() => createOrder(fd))
  }

  const byArea = AREAS.map(area => ({
    area,
    items: templates.filter(t => t.area === area),
  })).filter(g => g.items.length > 0)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Patient data */}
      <fieldset className="border border-black/10 p-5">
        <legend className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase px-1">Datos del paciente</legend>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div className="col-span-2 md:col-span-1">
            <Label>Nombre del paciente *</Label>
            <Input name="patientName" required placeholder="Ej. Mango" />
          </div>
          <div>
            <Label>Especie *</Label>
            <select name="species" required className={inputClass}>
              <option value="">Seleccionar…</option>
              <option>Canino</option>
              <option>Felino</option>
              <option>Otro</option>
            </select>
          </div>
          <div>
            <Label>Raza</Label>
            <Input name="breed" placeholder="Ej. Golden Retriever" />
          </div>
          <div>
            <Label>Edad</Label>
            <Input name="age" placeholder="Ej. 3 años" />
          </div>
          <div>
            <Label>Sexo</Label>
            <select name="sex" className={inputClass}>
              <option value="">ND</option>
              <option value="M">Macho</option>
              <option value="H">Hembra</option>
            </select>
          </div>
          <div>
            <Label>Nombre del dueño</Label>
            <Input name="ownerName" placeholder="Nombre del tutor" />
          </div>
        </div>
      </fieldset>

      {/* Clinic / vet */}
      <fieldset className="border border-black/10 p-5">
        <legend className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase px-1">Procedencia</legend>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <Label>Clínica</Label>
            <select name="clinicId" className={inputClass}>
              <option value="">Sin clínica</option>
              {clinics.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <Label>Veterinario solicitante</Label>
            <Input name="requestingVet" placeholder="Nombre del veterinario" />
          </div>
        </div>
      </fieldset>

      {/* Exam selection */}
      <fieldset className="border border-black/10 p-5">
        <legend className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase px-1">Exámenes solicitados *</legend>
        <div className="mt-3 space-y-4">
          {byArea.map(({ area, items }) => (
            <div key={area}>
              <p className="font-mono text-[8px] tracking-[0.18em] text-ink-2 uppercase mb-2">{area}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {items.map(t => (
                  <label key={t.id} className="flex items-start gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      name="templateIds"
                      value={t.id}
                      className="mt-0.5 accent-salvia-700"
                    />
                    <span className="font-sans text-sm">
                      {t.name}
                      <span className="block font-mono text-[8px] tracking-[0.1em] text-ink-2">{t.turnaround} · {t.sampleType}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      {/* Notes */}
      <div>
        <Label>Observaciones</Label>
        <textarea
          name="notes"
          rows={3}
          className={`${inputClass} resize-none`}
          placeholder="Notas clínicas, indicaciones especiales…"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.22em] uppercase px-6 py-3 hover:bg-salvia-800 transition-colors disabled:opacity-60"
      >
        {pending ? "Registrando…" : "Registrar muestra →"}
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
