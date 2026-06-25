"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function ClinicLoginForm() {
  const router = useRouter()
  const [clinicName, setClinicName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const res = await signIn("clinic", { clinicName, password, redirect: false })
    setLoading(false)
    if (res?.ok) {
      router.push("/resultados/dashboard")
    } else {
      setError("Nombre de clínica o contraseña incorrectos.")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-mono text-[9px] tracking-[0.18em] text-ink-2 uppercase mb-1.5">
          Nombre de la clínica
        </label>
        <input
          type="text"
          value={clinicName}
          onChange={e => setClinicName(e.target.value)}
          placeholder="Clínica Veterinaria Paws"
          required
          className="w-full border border-black/15 px-3 py-2.5 text-sm font-sans bg-white focus:outline-none focus:border-salvia-700 transition-colors"
        />
      </div>
      <div>
        <label className="block font-mono text-[9px] tracking-[0.18em] text-ink-2 uppercase mb-1.5">
          Contraseña
        </label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="w-full border border-black/15 px-3 py-2.5 text-sm font-sans bg-white focus:outline-none focus:border-salvia-700 transition-colors"
        />
      </div>
      {error && (
        <p className="font-mono text-[9px] tracking-[0.15em] text-red-600 uppercase">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.18em] uppercase py-3 hover:bg-salvia-800 transition-colors disabled:opacity-50 mt-2"
      >
        {loading ? "Ingresando..." : "Ingresar →"}
      </button>
    </form>
  )
}
