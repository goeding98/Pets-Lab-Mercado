import type { Metadata } from "next"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { can } from "@/lib/permissions"
import { loadMessengerData } from "@/lib/messengerData"
import MessengerMap from "./MessengerMap"

export const metadata: Metadata = { title: "Plan de mensajeros" }
export const dynamic = "force-dynamic"

// Plan de mensajeros (permiso "mensajeros": todo el personal interno). Rutas fijas para las sedes que más muestras
// mandan, calculadas en el navegador con lib/messengerRoutes.ts sobre las muestras de los últimos 30 días.
export default async function MensajerosPage() {
  const [{ lab, labLocated, points }, session] = await Promise.all([loadMessengerData(), getServerSession(authOptions)])
  const verClientes = can(session?.user.role, "clientes.ver") // el domiciliario no entra al mapa de clientes

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Mensajeros</p>
          <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">Plan de mensajeros</h1>
          <p className="font-sans text-sm text-ink-2 mt-1">
            Rutas fijas según las muestras de los últimos 30 días · {points.filter(p => p.m > 0).length} sedes con muestras
            {!labLocated && " · laboratorio sin ubicar en el mapa (se usa la dirección de Colseguros)"}
          </p>
        </div>
        {verClientes && (
          <Link href="/clientes/mapa" className="font-mono text-[9px] tracking-[0.15em] text-salvia-700 hover:underline uppercase mt-2">
            ← Mapa de clientes
          </Link>
        )}
      </div>
      <MessengerMap lab={lab} points={points} />
    </div>
  )
}
