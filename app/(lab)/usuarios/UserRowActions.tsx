"use client"
import { useTransition } from "react"
import Link from "next/link"
import { deleteUser } from "@/actions/users"

export default function UserRowActions({ userId, isSelf }: { userId: string; isSelf: boolean }) {
  const [pending, startTransition] = useTransition()

  function handleDelete() {
    if (!confirm("¿Eliminar este usuario? Esta acción no se puede deshacer.")) return
    startTransition(() => deleteUser(userId))
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/usuarios/${userId}`}
        className="font-mono text-[9px] tracking-[0.15em] uppercase text-salvia-700 hover:underline"
      >
        Editar
      </Link>
      {!isSelf && (
        <button
          onClick={handleDelete}
          disabled={pending}
          className="font-mono text-[9px] tracking-[0.15em] uppercase text-red-600 hover:underline disabled:opacity-50"
        >
          {pending ? "…" : "Eliminar"}
        </button>
      )}
    </div>
  )
}
