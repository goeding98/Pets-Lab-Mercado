"use client"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { saveCreditLine, setCreditLineActive } from "@/actions/credit"
import { formatCOP } from "@/lib/payment"

const TERMS = [15, 30]
const LIMITS = Array.from({ length: 10 }, (_, i) => (i + 1) * 1_000_000)
const mm = (n: number) => `${n / 1_000_000} MM`

type Row = {
  id: string; clinicId: string; clinicName: string; limit: number; termDays: number; active: boolean
  used: number; overdue: number; inMora: boolean; by: string; since: string
}

export default function CreditLinesManager({ clinics, rows }: { clinics: { id: string; name: string; nit: string | null }[]; rows: Row[] }) {
  const router = useRouter()
  const [clinicId, setClinicId] = useState("")
  const [termDays, setTermDays] = useState(30)
  const [limit, setLimit] = useState(1_000_000)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const existing = rows.find(r => r.clinicId === clinicId)
  const input = "border border-black/20 bg-white px-3 py-2.5 text-base sm:text-sm font-sans focus:outline-2 focus:outline-salvia-700"

  function pick(id: string) {
    setClinicId(id)
    const r = rows.find(x => x.clinicId === id)
    if (r) { setTermDays(r.termDays); setLimit(r.limit) }
    setError(null); setOk(null)
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!clinicId) return setError("Selecciona el cliente.")
    setError(null); setOk(null)
    const name = clinics.find(c => c.id === clinicId)?.name
    startTransition(async () => {
      const res = await saveCreditLine(clinicId, limit, termDays)
      if (res.error) return setError(res.error)
      setOk(`${existing ? "Línea actualizada" : "Línea abierta"}: ${name} · ${mm(limit)} a ${termDays} días.`)
      setClinicId("")
      router.refresh()
    })
  }

  function toggle(r: Row) {
    if (r.active && !confirm(`¿Cerrar la línea de ${r.clinicName}? Ya no se podrán registrar órdenes nuevas a crédito; lo que debe sigue en Cartera.`)) return
    setError(null); setOk(null)
    startTransition(async () => {
      const res = await setCreditLineActive(r.id, !r.active)
      if (res.error) setError(res.error)
      router.refresh()
    })
  }

  return (
    <>
      <form onSubmit={save} className="border border-black/10 bg-white p-4 md:p-5 mb-8">
        <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase mb-3">
          {existing ? "Modificar línea de crédito" : "Abrir línea de crédito"}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end">
          <label className="block">
            <span className="block font-mono text-[8px] tracking-[0.18em] uppercase text-ink-2 mb-1">Cliente</span>
            <select value={clinicId} onChange={e => pick(e.target.value)} className={`${input} w-full`}>
              <option value="">Seleccionar cliente…</option>
              {clinics.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.nit ? ` · NIT ${c.nit}` : ""}{rows.some(r => r.clinicId === c.id) ? " (ya tiene línea)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block font-mono text-[8px] tracking-[0.18em] uppercase text-ink-2 mb-1">Plazo</span>
            <select value={termDays} onChange={e => setTermDays(Number(e.target.value))} className={`${input} w-full`}>
              {TERMS.map(t => <option key={t} value={t}>{t} días</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block font-mono text-[8px] tracking-[0.18em] uppercase text-ink-2 mb-1">Cupo</span>
            <select value={limit} onChange={e => setLimit(Number(e.target.value))} className={`${input} w-full`}>
              {LIMITS.map(l => <option key={l} value={l}>{formatCOP(l)}</option>)}
            </select>
          </label>
          <button type="submit" disabled={pending}
            className="bg-salvia-700 text-bone font-mono text-[10px] tracking-[0.2em] uppercase px-5 py-3 hover:bg-salvia-800 disabled:opacity-60">
            {pending ? "Guardando…" : existing ? (existing.active ? "Guardar cambios" : "Reabrir línea") : "Abrir línea"}
          </button>
        </div>
        {existing && (
          <p className="font-sans text-[12px] text-ink-2 mt-2">
            Este cliente ya tiene línea ({mm(existing.limit)} · {existing.termDays} días{existing.active ? "" : " · cerrada"}). Al guardar se
            actualiza; las órdenes que ya están a crédito conservan su plazo.
          </p>
        )}
        {error && <p className="font-sans text-xs text-red-600 mt-2">{error}</p>}
        {ok && <p className="font-sans text-xs text-salvia-700 mt-2">{ok}</p>}
      </form>

      <p className="font-sans text-xs text-ink-2 mb-2">{rows.filter(r => r.active).length} líneas activas</p>
      {rows.length === 0 ? (
        <p className="border border-black/10 bg-white px-4 py-8 text-center font-sans text-sm text-ink-2">Aún no hay líneas de crédito.</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map(r => {
            const pct = Math.min(r.used / r.limit, 1)
            return (
              <div key={r.id} className={`border bg-white px-4 py-3 ${r.active ? "border-black/10" : "border-black/10 opacity-60"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-sans text-[15px] font-medium text-ink">{r.clinicName}</p>
                    <p className="font-sans text-xs text-ink-2 mt-0.5">
                      Cupo {formatCOP(r.limit)} · {r.termDays} días · desde {r.since} · {r.by}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!r.active && <Tag cls="bg-black/10 text-ink">Cerrada</Tag>}
                    {r.inMora && <Tag cls="bg-red-100 text-red-800">En mora {formatCOP(r.overdue)}</Tag>}
                    {r.used > r.limit && <Tag cls="bg-amber-100 text-amber-900">Sobre cupo</Tag>}
                    <button type="button" onClick={() => pick(r.clinicId)} className="font-mono text-[9px] tracking-[0.15em] uppercase text-salvia-700 hover:underline px-1 py-1">
                      Editar
                    </button>
                    <button type="button" onClick={() => toggle(r)} disabled={pending} className="font-mono text-[9px] tracking-[0.15em] uppercase text-ink-2 hover:text-ink hover:underline px-1 py-1">
                      {r.active ? "Cerrar" : "Reabrir"}
                    </button>
                  </div>
                </div>
                <div className="mt-2.5">
                  <div className="h-1.5 bg-black/[0.06]">
                    <div className={`h-full ${r.used > r.limit ? "bg-amber-500" : r.inMora ? "bg-red-600" : "bg-salvia-700"}`} style={{ width: `${pct * 100}%` }} />
                  </div>
                  <p className="font-sans text-xs text-ink-2 mt-1">
                    Debe {formatCOP(r.used)} · disponible {formatCOP(Math.max(r.limit - r.used, 0))}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </>
  )
}

function Tag({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={`font-mono text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 ${cls}`}>{children}</span>
}
