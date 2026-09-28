"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { registerClinic } from "./actions"

const FIELDS: { name: string; label: string; type?: string; placeholder: string; full?: boolean; autoComplete?: string }[] = [
  { name: "name", label: "Razón social", placeholder: "Clínica Veterinaria El Bosque S.A.S.", full: true, autoComplete: "organization" },
  { name: "nit", label: "NIT o cédula", placeholder: "900.123.456-7" },
  { name: "contactName", label: "Nombre de la persona", placeholder: "Nombre y apellido", autoComplete: "name" },
  { name: "email", label: "Correo electrónico", type: "email", placeholder: "contacto@miclinica.com", full: true, autoComplete: "email" },
  { name: "address", label: "Dirección", placeholder: "Cra 5 #20-30", full: true, autoComplete: "street-address" },
  { name: "neighborhood", label: "Barrio", placeholder: "San Fernando" },
  { name: "city", label: "Ciudad", placeholder: "Cali", autoComplete: "address-level2" },
  { name: "password", label: "Contraseña", type: "password", placeholder: "Mínimo 8 caracteres", autoComplete: "new-password" },
  { name: "confirmPassword", label: "Confirmar contraseña", type: "password", placeholder: "••••••••", autoComplete: "new-password" },
]

export default function ClinicRegisterForm() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const res = await registerClinic(fd)
    if (res.error) {
      setError(res.error)
      setLoading(false)
      return
    }
    // Cuenta creada: iniciar sesión directamente
    const login = await signIn("clinic", {
      login: fd.get("email") as string,
      password: fd.get("password") as string,
      redirect: false,
    })
    setLoading(false)
    if (login?.ok) {
      router.push("/portal-vet/dashboard")
      router.refresh()
    } else {
      setError("Cuenta creada. Inicia sesión con tu correo y contraseña.")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
      {FIELDS.map(f => (
        <div key={f.name} className={f.full ? "col-span-2" : "col-span-2 sm:col-span-1"}>
          <label htmlFor={`reg-${f.name}`} className="block font-mono text-[9px] tracking-[0.18em] text-ink-2 uppercase mb-1.5">
            {f.label} *
          </label>
          <input
            id={`reg-${f.name}`}
            name={f.name}
            type={f.type ?? "text"}
            placeholder={f.placeholder}
            autoComplete={f.autoComplete}
            minLength={f.type === "password" ? 8 : undefined}
            required
            className="w-full border border-black/15 px-3 py-2.5 text-sm font-sans bg-white focus:outline-none focus:border-salvia-700 transition-colors"
          />
        </div>
      ))}
      {error && (
        <p className="col-span-2 font-mono text-[9px] tracking-[0.15em] text-red-600 uppercase leading-[1.6]">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="col-span-2 w-full bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.18em] uppercase py-3 hover:bg-salvia-800 transition-colors disabled:opacity-50 mt-2"
      >
        {loading ? "Creando cuenta..." : "Crear cuenta →"}
      </button>
    </form>
  )
}
