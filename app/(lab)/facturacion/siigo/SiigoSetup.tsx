"use client"
import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { disconnectSiigo, loadSiigoCatalogs, saveSiigoCredentials, saveSiigoDefaults } from "@/actions/siigo"

type Defaults = { documentId: number | null; paymentId: number | null; sellerId: number | null; productCode: string; taxId: number | null; taxPercent: number; dueDays: number; sendEmail: boolean }
type Catalogs = {
  documents: { id: number; name: string }[]; payments: { id: number; name: string }[]; users: { id: number; name: string }[]
  taxes: { id: number; name: string; percent: number }[]; products: { code: string; name: string }[]
}

const input = "w-full border border-black/20 bg-white px-3 py-2 text-sm font-sans focus:outline-2 focus:outline-salvia-700"
const label = "block font-mono text-[9px] tracking-[0.18em] uppercase text-salvia-700 mb-1.5"
const btn = "bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.2em] uppercase px-5 py-2.5 hover:bg-salvia-800 disabled:opacity-50"

export default function SiigoSetup({ connectedAs, current, ready }: { connectedAs: string | null; current: Defaults | null; ready: boolean }) {
  const router = useRouter()
  const [user, setUser] = useState(connectedAs ?? "")
  const [key, setKey] = useState("")
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [cats, setCats] = useState<Catalogs | null>(null)
  const [d, setD] = useState<Defaults>(current ?? { documentId: null, paymentId: null, sellerId: null, productCode: "", taxId: null, taxPercent: 0, dueDays: 0, sendEmail: true })
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!connectedAs) return
    startTransition(async () => {
      const r = await loadSiigoCatalogs()
      if ("catalogs" in r && r.catalogs) setCats(r.catalogs)
      else if (r.error) setMsg({ ok: false, text: r.error })
    })
  }, [connectedAs])

  function connect() {
    setMsg(null)
    startTransition(async () => {
      const r = await saveSiigoCredentials(user, key)
      if (r.error) return setMsg({ ok: false, text: r.error })
      setKey("")
      setMsg({ ok: true, text: "Conectado con Siigo. Ahora elige los valores de la factura." })
      router.refresh()
    })
  }
  function save() {
    setMsg(null)
    startTransition(async () => {
      const r = await saveSiigoDefaults(d)
      setMsg(r.error ? { ok: false, text: r.error } : { ok: true, text: "Listo: ya se puede facturar en Siigo desde Facturación." })
      if (!r.error) router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border border-black/[0.08] p-5">
        <p className="font-sans text-sm font-semibold text-ink mb-1">1. Credenciales de integración</p>
        <p className="font-sans text-xs text-ink-2 mb-3">
          {connectedAs ? <>Conectado como <strong>{connectedAs}</strong>. Para cambiarlas, escribe las nuevas.</> : "Pega el usuario API y la access key que genera Siigo."}
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div><span className={label}>Usuario API (correo)</span><input value={user} onChange={e => setUser(e.target.value)} className={input} autoComplete="off" /></div>
          <div><span className={label}>Access key</span><input value={key} onChange={e => setKey(e.target.value)} type="password" className={input} autoComplete="new-password" placeholder={connectedAs ? "•••••• (guardada)" : ""} /></div>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <button type="button" onClick={connect} disabled={pending || !user.trim() || !key.trim()} className={btn}>{pending ? "Probando…" : "Probar y guardar"}</button>
          {connectedAs && (
            <button type="button" disabled={pending} onClick={() => confirm("¿Desconectar Siigo? Se borran las credenciales guardadas.") && startTransition(async () => { await disconnectSiigo(); router.refresh() })}
              className="border border-red-300 text-red-700 font-mono text-[10px] tracking-[0.18em] uppercase px-4 py-2.5">Desconectar</button>
          )}
        </div>
      </section>

      {connectedAs && (
        <section className="bg-white border border-black/[0.08] p-5">
          <p className="font-sans text-sm font-semibold text-ink mb-1">2. Cómo se arma la factura {ready && <span className="text-salvia-700">✓</span>}</p>
          <p className="font-sans text-xs text-ink-2 mb-3">Opciones tal como están en tu Siigo. Cada examen va como un ítem de la factura con este producto.</p>
          {!cats ? <p className="font-sans text-sm text-ink-2">{pending ? "Cargando opciones de Siigo…" : "No se pudieron cargar las opciones."}</p> : (
            <div className="grid sm:grid-cols-2 gap-3">
              <div><span className={label}>Comprobante (factura de venta) *</span>
                <select value={d.documentId ?? ""} onChange={e => setD({ ...d, documentId: Number(e.target.value) || null })} className={input}>
                  <option value="">Elegir…</option>{cats.documents.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select></div>
              <div><span className={label}>Forma de pago *</span>
                <select value={d.paymentId ?? ""} onChange={e => setD({ ...d, paymentId: Number(e.target.value) || null })} className={input}>
                  <option value="">Elegir…</option>{cats.payments.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select></div>
              <div><span className={label}>Producto / servicio *</span>
                <select value={d.productCode} onChange={e => setD({ ...d, productCode: e.target.value })} className={input}>
                  <option value="">Elegir…</option>{cats.products.map(x => <option key={x.code} value={x.code}>{x.name} ({x.code})</option>)}
                </select></div>
              <div><span className={label}>Vendedor</span>
                <select value={d.sellerId ?? ""} onChange={e => setD({ ...d, sellerId: Number(e.target.value) || null })} className={input}>
                  <option value="">Ninguno</option>{cats.users.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select></div>
              <div><span className={label}>Impuesto de los ítems</span>
                <select value={d.taxId ?? ""} onChange={e => { const t = cats.taxes.find(x => x.id === Number(e.target.value)); setD({ ...d, taxId: t?.id ?? null, taxPercent: t?.percent ?? 0 }) }} className={input}>
                  <option value="">Sin impuesto (excluido)</option>{cats.taxes.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                </select></div>
              <div><span className={label}>Plazo de pago (días)</span>
                <input type="number" min={0} max={120} value={d.dueDays} onChange={e => setD({ ...d, dueDays: Number(e.target.value) })} className={input} /></div>
              <label className="sm:col-span-2 flex items-center gap-2 font-sans text-sm text-ink">
                <input type="checkbox" checked={d.sendEmail} onChange={e => setD({ ...d, sendEmail: e.target.checked })} className="accent-salvia-700" />
                Que Siigo envíe la factura al correo de facturación del cliente
              </label>
              <div className="sm:col-span-2"><button type="button" onClick={save} disabled={pending} className={btn}>{pending ? "Guardando…" : "Guardar"}</button></div>
            </div>
          )}
        </section>
      )}
      {msg && <p className={`font-sans text-sm ${msg.ok ? "text-salvia-700" : "text-red-600"}`}>{msg.text}</p>}
    </div>
  )
}
