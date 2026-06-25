"use client"
import { useTransition, useState } from "react"
import { useRouter } from "next/navigation"
import { updateUser } from "@/actions/users"

type Props = {
  user: { id: string; name: string; email: string; role: string }
  isSelf: boolean
}

export default function EditUserForm({ user, isSelf }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await updateUser(user.id, {
          name: fd.get("name") as string,
          email: fd.get("email") as string,
          role: fd.get("role") as string,
          password: fd.get("password") as string,
        })
        router.push("/usuarios")
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Error al guardar")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Nombre</label>
        <input name="name" required defaultValue={user.name} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Email</label>
        <input name="email" type="email" required defaultValue={user.email} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Rol</label>
        <select name="role" defaultValue={user.role} disabled={isSelf} className={inputClass}>
          <option value="ADMIN">Admin</option>
          <option value="STAFF">Staff</option>
          <option value="CLINIC">Clínica</option>
        </select>
        {isSelf && <p className="font-mono text-[9px] text-ink-2 mt-1">No puedes cambiar tu propio rol.</p>}
      </div>
      <div>
        <label className={labelClass}>Nueva contraseña <span className="text-ink-2">(dejar vacío para no cambiar)</span></label>
        <input name="password" type="password" placeholder="••••••••" className={inputClass} />
      </div>

      {error && <p className="font-sans text-xs text-red-600">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.22em] uppercase px-5 py-3 hover:bg-salvia-800 transition-colors disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar cambios"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/usuarios")}
          className="border border-ink/20 font-mono text-[10px] tracking-[0.22em] uppercase px-5 py-3 hover:bg-black/5 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

const inputClass = "w-full border border-black/20 bg-white px-3 py-2 text-sm font-sans focus:outline-2 focus:outline-salvia-700 focus:outline-offset-0"
const labelClass = "block font-mono text-[9px] tracking-[0.18em] uppercase text-salvia-700 mb-1.5"
