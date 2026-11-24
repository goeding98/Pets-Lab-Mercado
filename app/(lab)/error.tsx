"use client"
// Pantalla de error del LIMS (en vez del "Application error" genérico de Next): dice qué pasó, deja reintentar sin
// perder la sesión y muestra un código para buscar el error en los registros de Vercel. En producción Next oculta el
// texto de los errores del servidor (solo llega `digest`); los errores del navegador sí traen su mensaje.
import { useEffect, useState } from "react"
import Link from "next/link"

export default function LabError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const [where, setWhere] = useState({ path: "", time: "" })
  useEffect(() => {
    console.error(error)
    setWhere({ path: window.location.pathname, time: new Date().toLocaleString("es-CO", { timeZone: "America/Bogota" }) })
  }, [error])

  const serverError = !!error.digest
  return (
    <div className="px-4 py-10 md:px-8 max-w-xl">
      <p className="font-mono text-[9px] tracking-[0.22em] text-red-700 uppercase">Algo salió mal</p>
      <h1 className="font-serif text-[26px] font-medium tracking-[-0.02em] mt-1">No se pudo completar la acción</h1>
      <p className="font-sans text-sm text-ink-2 mt-3">
        {serverError
          ? "El sistema rechazó la operación. Revisa los datos e intenta de nuevo; si sigue pasando, envía un pantallazo de esta página."
          : "La página tuvo un problema en este navegador. Intenta de nuevo; si sigue pasando, envía un pantallazo de esta página."}
      </p>
      <p className="font-sans text-xs text-ink-2 mt-2">
        Si el celular está traduciendo la página (Google Traductor), desactiva la traducción para este sitio.
      </p>

      <div className="mt-4 border border-black/10 bg-white px-4 py-3 font-mono text-[11px] text-ink-2 break-words">
        {!serverError && error.message && <p>Detalle: {error.message}</p>}
        {error.digest && <p>Código: {error.digest}</p>}
        {where.path && <p>Página: {where.path}</p>}
        {where.time && <p>Hora: {where.time}</p>}
      </div>

      <div className="flex flex-wrap gap-3 mt-5">
        <button
          type="button"
          onClick={() => reset()}
          className="bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.22em] uppercase px-5 py-3 hover:bg-salvia-800 transition-colors"
        >
          Intentar de nuevo
        </button>
        <Link
          href="/muestras"
          className="border border-salvia-700 text-salvia-700 font-mono text-[10px] tracking-[0.22em] uppercase px-5 py-3 hover:bg-salvia-700 hover:text-bone transition-colors"
        >
          Ir a Muestras
        </Link>
      </div>
    </div>
  )
}
