import type { Metadata } from "next"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { can } from "@/lib/permissions"
import { loadMessengerData } from "@/lib/messengerData"
import MessengerMap from "./MessengerMap"
import BackToAutomatic from "./BackToAutomatic"
import { getManualRoutes } from "@/lib/manualRoutes"

export const metadata: Metadata = { title: "Plan de mensajeros" }
export const dynamic = "force-dynamic"

// Plan de mensajeros (permiso "mensajeros": todo el personal interno). Rutas fijas para las sedes que más muestras
// mandan, calculadas en el navegador con lib/messengerRoutes.ts sobre las muestras de los últimos 30 días.
export default async function MensajerosPage({ searchParams }: { searchParams: { armado?: string } }) {
  const [{ lab, labLocated, points }, session, manual] = await Promise.all([loadMessengerData(), getServerSession(authOptions), getManualRoutes()])
  const verClientes = can(session?.user.role, "clientes.ver") // el domiciliario no entra al mapa de clientes
  const canEdit = can(session?.user.role, "rutas.editar") // "Armar mapa": ADMIN y COMERCIAL
  const fecha = manual ? new Date(manual.at).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "long", hour: "numeric", minute: "2-digit" }) : ""

  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Mensajeros</p>
          <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">Plan de mensajeros</h1>
          <p className="font-sans text-sm text-ink-2 mt-1">
            {manual ? `Mapa armado a mano por ${manual.by || "el equipo"} el ${fecha}` : "Rutas fijas según las muestras de los últimos 30 días"}
            {" · "}{points.filter(p => p.m > 0).length} sedes con muestras
            {!labLocated && " · laboratorio sin ubicar en el mapa (se usa la dirección de Colseguros)"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          {canEdit && (
            <Link href="/clientes/mensajeros/armar"
              className="bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.2em] uppercase px-4 py-2.5 hover:bg-salvia-800">
              Armar mapa
            </Link>
          )}
          {canEdit && manual && <BackToAutomatic />}
          {verClientes && (
            <Link href="/clientes/mapa" className="font-mono text-[9px] tracking-[0.15em] text-salvia-700 hover:underline uppercase">
              ← Mapa de clientes
            </Link>
          )}
        </div>
      </div>
      {searchParams.armado && manual && (
        <div className="bg-salvia-50 border border-salvia-700/20 px-4 py-3 mb-4 font-sans text-sm text-salvia-800">
          Listo: el mapa nuevo quedó guardado. Ya lo usan el PDF de instrucciones y el Día a día de los mensajeros.
        </div>
      )}
      <MessengerMap lab={lab} points={points} manual={manual ? manual.rutas : null} />
    </div>
  )
}
