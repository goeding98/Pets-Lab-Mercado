"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { registerClinic } from "./actions"

type Field = { name: string; label: string; type?: string; placeholder: string; full?: boolean; autoComplete?: string; optional?: boolean }

const ACCOUNT: Field[] = [
  { name: "name", label: "Razón social", placeholder: "Clínica Veterinaria El Bosque S.A.S.", full: true, autoComplete: "organization" },
  { name: "nit", label: "NIT o cédula", placeholder: "900.123.456-7" },
  { name: "contactName", label: "Nombre de la persona", placeholder: "Nombre y apellido", autoComplete: "name" },
  { name: "email", label: "Correo electrónico", type: "email", placeholder: "contacto@miclinica.com", full: true, autoComplete: "email" },
]
// La dirección de la cuenta es la sede principal; se pueden agregar más sedes (mismo NIT)
const MAIN_BRANCH: Field[] = [
  { name: "branchName", label: "Nombre de la sede", placeholder: "Ej. Principal, Sede Norte", full: true, optional: true },
  { name: "address", label: "Dirección", placeholder: "Cra 5 #20-30", full: true, autoComplete: "street-address" },
  { name: "neighborhood", label: "Barrio", placeholder: "San Fernando" },
  { name: "city", label: "Ciudad", placeholder: "Cali", autoComplete: "address-level2" },
]
const PASSWORD: Field[] = [
  { name: "password", label: "Contraseña", type: "password", placeholder: "Mínimo 8 caracteres", autoComplete: "new-password" },
  { name: "confirmPassword", label: "Confirmar contraseña", type: "password", placeholder: "••••••••", autoComplete: "new-password" },
]

const labelClass = "block font-mono text-[9px] tracking-[0.18em] text-ink-2 uppercase mb-1.5"
const inputClass = "w-full border border-black/15 px-3 py-2.5 text-sm font-sans bg-white focus:outline-none focus:border-salvia-700 transition-colors"
const sectionClass = "col-span-2 font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase pt-3 border-t border-black/[0.08] mt-1"

function FieldInput({ f }: { f: Field }) {
  return (
    <div className={f.full ? "col-span-2" : "col-span-2 sm:col-span-1"}>
      <label htmlFor={`reg-${f.name}`} className={labelClass}>
        {f.label}{!f.optional && " *"}
      </label>
      <input
        id={`reg-${f.name}`}
        name={f.name}
        type={f.type ?? "text"}
        placeholder={f.placeholder}
        autoComplete={f.autoComplete}
        minLength={f.type === "password" ? 8 : undefined}
        required={!f.optional}
        className={inputClass}
      />
    </div>
  )
}

export default function ClinicRegisterForm() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [extraBranches, setExtraBranches] = useState<number[]>([])
  const [nextKey, setNextKey] = useState(0)

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
      {ACCOUNT.map(f => <FieldInput key={f.name} f={f} />)}

      <p className={sectionClass}>Sede principal</p>
      {MAIN_BRANCH.map(f => <FieldInput key={f.name} f={f} />)}

      {extraBranches.map((k, i) => (
        <div key={k} className="col-span-2 grid grid-cols-2 gap-4">
          <div className={`${sectionClass} flex items-center justify-between`}>
            <span>Sede {i + 2}</span>
            <button
              type="button"
              onClick={() => setExtraBranches(list => list.filter(x => x !== k))}
              className="font-mono text-[9px] tracking-[0.15em] uppercase text-red-600 hover:text-red-800"
            >
              Quitar
            </button>
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Nombre de la sede *</label>
            <input name="extraName" required placeholder="Ej. Sede Norte" className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Dirección *</label>
            <input name="extraAddress" required placeholder="Cra 5 #20-30" className={inputClass} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={labelClass}>Barrio</label>
            <input name="extraNeighborhood" placeholder="San Fernando" className={inputClass} />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={labelClass}>Ciudad</label>
            <input name="extraCity" defaultValue="Cali" className={inputClass} />
          </div>
        </div>
      ))}
      <div className="col-span-2">
        <button
          type="button"
          onClick={() => { setExtraBranches(list => [...list, nextKey]); setNextKey(n => n + 1) }}
          className="border border-salvia-700 text-salvia-700 font-mono text-[9px] tracking-[0.18em] uppercase px-4 py-2 hover:bg-salvia-50"
        >
          + Agregar otra sede
        </button>
        <p className="font-sans text-[11px] text-ink-2 mt-1.5">
          Si tu clínica tiene varias sedes con el mismo NIT. También puedes agregarlas después desde tu cuenta.
        </p>
      </div>

      <p className={sectionClass}>Acceso</p>
      {PASSWORD.map(f => <FieldInput key={f.name} f={f} />)}
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
