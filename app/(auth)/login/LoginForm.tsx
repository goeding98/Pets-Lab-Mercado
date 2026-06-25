"use client"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginForm() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setLoading(true)
    const fd = new FormData(e.currentTarget)
    const res = await signIn("staff", {
      email: fd.get("email"),
      password: fd.get("password"),
      redirect: false,
    })
    setLoading(false)
    if (res?.error) {
      setError("Credenciales incorrectas. Verifica tu email y contraseña.")
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block font-mono text-[9px] tracking-[0.18em] uppercase text-salvia-700 mb-1.5">
          Email
        </label>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full border border-black/20 bg-white px-3 py-2.5 text-sm font-sans focus:outline-2 focus:outline-salvia-700 focus:outline-offset-0"
          placeholder="tu@email.com"
        />
      </div>
      <div>
        <label className="block font-mono text-[9px] tracking-[0.18em] uppercase text-salvia-700 mb-1.5">
          Contraseña
        </label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full border border-black/20 bg-white px-3 py-2.5 text-sm font-sans focus:outline-2 focus:outline-salvia-700 focus:outline-offset-0"
          placeholder="••••••••"
        />
      </div>
      {error && (
        <p className="text-red-600 text-xs font-sans">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.22em] uppercase px-5 py-3 hover:bg-salvia-800 transition-colors disabled:opacity-60 focus:outline-2 focus:outline-salvia-700"
      >
        {loading ? "Entrando…" : "Entrar →"}
      </button>
    </form>
  )
}
