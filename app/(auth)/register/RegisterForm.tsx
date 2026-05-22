"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { registerUser } from "./actions"
import type { Clinic } from "@prisma/client"

export default function RegisterForm({ clinics }: { clinics: Clinic[] }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await registerUser(fd)
      if (result?.error) {
        setError(result.error)
      } else {
        router.push("/usuarios")
      }
    })
  }

  const inputClass = "w-full border border-black/20 bg-white px-3 py-2.5 text-sm font-sans focus:outline-2 focus:outline-salvia-700"
  function Label({ children }: { children: React.ReactNode }) {
    return <label className="block font-mono text-[9px] tracking-[0.18em] uppercase text-salvia-700 mb-1.5">{children}</label>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Nombre completo *</Label>
        <input name="name" required className={inputClass} placeholder="Ej. María García" />
      </div>
      <div>
        <Label>Email *</Label>
        <input name="email" type="email" required className={inputClass} />
      </div>
      <div>
        <Label>Contraseña *</Label>
        <input name="password" type="password" required minLength={8} className={inputClass} placeholder="Mínimo 8 caracteres" />
      </div>
      <div>
        <Label>Rol *</Label>
        <select name="role" required className={inputClass}>
          <option value="STAFF">Staff (microbiólogo)</option>
          <option value="ADMIN">Admin</option>
          <option value="CLINIC">Clínica</option>
        </select>
      </div>
      <div>
        <Label>Clínica (solo para rol Clínica)</Label>
        <select name="clinicId" className={inputClass}>
          <option value="">Sin clínica</option>
          {clinics.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      {error && <p className="text-red-600 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.22em] uppercase px-5 py-3 hover:bg-salvia-800 transition-colors disabled:opacity-60"
      >
        {pending ? "Creando…" : "Crear usuario →"}
      </button>
    </form>
  )
}
