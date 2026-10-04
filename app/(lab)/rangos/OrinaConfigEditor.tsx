"use client"
import { useState, useTransition } from "react"
import { saveOrinaConfig } from "@/actions/ranges"
import { CAT_PARAMS, NUM_PARAMS, PARAM_LABEL, PARAM_OPTIONS, type OrinaConfig, type Species } from "@/lib/orina"

// Valores de referencia del Parcial de Orina por especie (texto que sale en el PDF + qué resultados
// son normales / mínimos y máximos, para la negrita) y cortes del UPC. Se guardan en LabSetting.
const input = "border border-black/20 bg-white px-2 py-1 text-xs font-mono w-full focus:outline-salvia-700"
const th = "font-mono text-[8px] tracking-[0.15em] text-salvia-700 uppercase pb-1 pr-3 text-left"
const SPECIES: { key: Species; label: string }[] = [{ key: "canino", label: "Canino" }, { key: "felino", label: "Felino" }]

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")))

export default function OrinaConfigEditor({ initial }: { initial: OrinaConfig }) {
  const [cfg, setCfg] = useState(initial)
  const [sp, setSp] = useState<Species>("canino")
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const refs = cfg.ref[sp]

  const setRef = (param: string, patch: Record<string, unknown>) => {
    setMsg(null)
    setCfg(c => ({ ...c, ref: { ...c.ref, [sp]: { ...c.ref[sp], [param]: { ...c.ref[sp][param as keyof typeof refs], ...patch } } } }))
  }
  const setUpc = (k: "limitrofe" | "proteinurico", v: string) => {
    setMsg(null)
    setCfg(c => ({ ...c, upc: { ...c.upc, [sp]: { ...c.upc[sp], [k]: Number(v.replace(",", ".")) } } }))
  }

  function save() {
    startTransition(async () => {
      try {
        const res = await saveOrinaConfig(cfg)
        setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: "Guardado. Aplica a los resultados y PDF de orina." })
      } catch {
        setMsg({ ok: false, text: "No se pudo guardar. Recarga e intenta de nuevo." })
      }
    })
  }

  return (
    <div className="px-4 pb-4">
      <div className="flex gap-2 mb-3">
        {SPECIES.map(s => (
          <button key={s.key} type="button" onClick={() => setSp(s.key)}
            className={`font-mono text-[9px] tracking-[0.18em] uppercase px-3 py-1.5 border ${sp === s.key ? "bg-salvia-700 text-bone border-salvia-700" : "border-black/15 text-ink hover:border-salvia-700"}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr><th className={th}>Parámetro</th><th className={th}>Referencia (texto en el PDF)</th><th className={th}>Normal</th></tr></thead>
          <tbody>
            {CAT_PARAMS.map(p => (
              <tr key={p} className="border-t border-black/[0.05] align-top">
                <td className="py-1.5 pr-3 font-sans text-ink w-[22%]">{PARAM_LABEL[p]}</td>
                <td className="py-1.5 pr-3 w-[30%]"><input value={refs[p].texto} onChange={e => setRef(p, { texto: e.target.value })} className={input} /></td>
                <td className="py-1.5">
                  <div className="flex flex-wrap gap-x-3 gap-y-1">
                    {PARAM_OPTIONS[p].map(o => (
                      <label key={o} className="flex items-center gap-1 font-sans text-[11px] text-ink">
                        <input
                          type="checkbox"
                          checked={refs[p].normales.includes(o)}
                          onChange={e => setRef(p, { normales: e.target.checked ? [...refs[p].normales, o] : refs[p].normales.filter(n => n !== o) })}
                          className="accent-salvia-700"
                        />
                        {o}
                      </label>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
            {NUM_PARAMS.map(p => (
              <tr key={p} className="border-t border-black/[0.05] align-top">
                <td className="py-1.5 pr-3 font-sans text-ink">{PARAM_LABEL[p]}</td>
                <td className="py-1.5 pr-3"><input value={refs[p].texto} onChange={e => setRef(p, { texto: e.target.value })} className={input} /></td>
                <td className="py-1.5">
                  <div className="flex items-center gap-2 max-w-xs">
                    <span className="font-sans text-[11px] text-ink-2">mín.</span>
                    <input type="number" step="any" value={refs[p].min ?? ""} onChange={e => setRef(p, { min: numOrNull(e.target.value) })} className={input} />
                    <span className="font-sans text-[11px] text-ink-2">máx.</span>
                    <input type="number" step="any" value={refs[p].max ?? ""} onChange={e => setRef(p, { max: numOrNull(e.target.value) })} className={input} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4">
        <p className="font-mono text-[8px] tracking-[0.18em] text-salvia-700 uppercase mb-1">Cortes del UPC ({sp})</p>
        <div className="flex flex-wrap items-center gap-2 font-sans text-xs text-ink">
          No proteinúrico {"<"}
          <input type="number" step="0.01" value={cfg.upc[sp].limitrofe} onChange={e => setUpc("limitrofe", e.target.value)} className={`${input} w-20`} />
          · Limítrofe hasta
          <input type="number" step="0.01" value={cfg.upc[sp].proteinurico} onChange={e => setUpc("proteinurico", e.target.value)} className={`${input} w-20`} />
          · Proteinúrico por encima
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4">
        <button type="button" onClick={save} disabled={pending}
          className="bg-salvia-700 text-bone font-mono text-[9px] tracking-[0.18em] uppercase px-4 py-2 hover:bg-salvia-800 disabled:opacity-50">
          {pending ? "Guardando…" : "Guardar referencias de orina"}
        </button>
        {msg && <p className={`font-sans text-xs ${msg.ok ? "text-salvia-700" : "text-red-600"}`}>{msg.text}</p>}
      </div>
    </div>
  )
}
