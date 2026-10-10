import type { Metadata } from "next"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getSiigoSettings, siigoReady } from "@/lib/siigo"
import SiigoSetup from "./SiigoSetup"

export const metadata: Metadata = { title: "Conectar Siigo" }
export const dynamic = "force-dynamic"

// Configuración de la integración con Siigo (solo ADMIN): credenciales de integración y valores por defecto
export default async function SiigoPage() {
  const session = await getServerSession(authOptions)
  const s = await getSiigoSettings()

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl">
      <Link href="/facturacion" className="font-mono text-[9px] tracking-[0.18em] text-ink-2 hover:text-ink uppercase">← Facturación</Link>
      <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-2">Conectar Siigo</h1>
      <p className="font-sans text-sm text-ink-2 mt-2 mb-6">
        Con esto Petslab emite la factura electrónica en Siigo con un clic desde Facturación. Se usan las
        <strong> credenciales de integración</strong> de Siigo (usuario API + access key), no la contraseña de la página.
      </p>
      {session?.user.role !== "ADMIN" ? (
        <p className="font-sans text-sm text-ink border border-black/10 bg-salvia-50 px-4 py-4">
          Solo un administrador puede configurar la conexión. Estado: <strong>{siigoReady(s) ? "conectado" : "sin conectar"}</strong>.
        </p>
      ) : (
        <SiigoSetup
          connectedAs={s?.username ?? null}
          current={s ? { documentId: s.documentId, paymentCash: s.paymentCash, paymentTransfer: s.paymentTransfer, paymentCredit: s.paymentCredit, sellerId: s.sellerId, productCode: s.productCode, taxId: s.taxId, taxPercent: s.taxPercent, dueDays: s.dueDays, sendEmail: s.sendEmail } : null}
          ready={siigoReady(s)}
        />
      )}
    </div>
  )
}
