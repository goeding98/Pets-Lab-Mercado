"use client"
// Pedir recogida en el Portal Vet (recogidas con garantía, lib/pickups.ts): versión corta del formulario de solicitud.
// Mascota (nombre, especie, edad, tutor), los exámenes más pedidos en botones de un toque (los personalizados de la
// clínica primero) y el resto del catálogo detrás de "Ver todos". Manda los mismos campos que OrderForm a
// createPortalOrder (app/(web)/portal-vet/actions.ts).
import { useMemo, useState, useTransition } from "react"

type Tpl = { id: string; name: string; area: string; description: string | null; isCustom: boolean }
type Branch = { id: string; name: string; address: string }

// "Coprológico (Microscopía y Miniflotac)" → "Coprológico"; "Parcial de Orina – Completo (Tirilla…)" → "Parcial de Orina – Completo"
const short = (n: string) => n.replace(/\s*\(.*\)\s*$/, "")

export default function QuickPickupForm({ templates, featuredIds, branches, action, submitLabel }: {
  templates: Tpl[]
  featuredIds: string[]
  branches: Branch[]
  action: (fd: FormData) => Promise<void | { error?: string }>
  submitLabel: string
}) {
  const [species, setSpecies] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [showAll, setShowAll] = useState(false)
  const [q, setQ] = useState("")
  const [error, setError] = useState("")
  const [pending, start] = useTransition()

  const byId = useMemo(() => new Map(templates.map(t => [t.id, t])), [templates])
  const featured = featuredIds.map(id => byId.get(id)).filter((t): t is Tpl => !!t)
  const toggle = (id: string) => setSelected(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))

  const rest = useMemo(() => {
    const k = q.trim().toLowerCase()
    const list = templates.filter(t => !k || t.name.toLowerCase().includes(k) || (t.description ?? "").toLowerCase().includes(k))
    const areas = Array.from(new Set(list.map(t => t.area)))
    return areas.map(a => ({ area: a, items: list.filter(t => t.area === a) }))
  }, [templates, q])

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const miss = !String(fd.get("patientName") ?? "").trim() ? "Escribe el nombre de la mascota."
      : !species ? "Elige la especie."
      : selected.length === 0 ? "Elige al menos un examen."
      : fd.get("sampleReady") !== "1" ? "Marca que la muestra ya está lista: el mensajero no puede esperar." : ""
    if (miss) { setError(miss); return }
    setError("")
    start(async () => {
      try {
        const r = await action(fd)
        if (r && r.error) setError(r.error)
      } catch (err) {
        const digest = (err as { digest?: unknown })?.digest
        if (typeof digest === "string" && digest.startsWith("NEXT_")) throw err // redirección al terminar
        const offline = err instanceof TypeError || /fetch|network|load failed/i.test(String((err as Error)?.message ?? ""))
        setError(offline
          ? "No hubo conexión y la recogida no se pidió. Revisa la conexión y vuelve a tocar el botón: tus datos siguen aquí."
          : "No se pudo pedir la recogida. Intenta de nuevo; si sigue pasando, escríbenos por WhatsApp.")
      }
    })
  }

  const field = "w-full border border-black/20 bg-white px-3 py-2.5 text-[15px] font-sans focus:outline-2 focus:outline-salvia-700"
  const label = "block font-mono text-[9px] tracking-[0.18em] uppercase text-salvia-700 mb-1.5"
  const tile = (on: boolean) =>
    `text-left px-3.5 py-3 border transition-colors ${on ? "bg-salvia-700 border-salvia-700 text-bone" : "bg-white border-black/15 hover:border-salvia-700"}`

  return (
    <form onSubmit={submit} className="space-y-6">
      {selected.map(id => <input key={id} type="hidden" name="templateIds" value={id} />)}
      <input type="hidden" name="species" value={species} />
      {branches.length === 1 && <input type="hidden" name="branchId" value={branches[0].id} />}

      {/* 1. Mascota */}
      <section className="border border-black/10 bg-white p-5 space-y-4">
        <h2 className="font-serif text-[20px] font-medium">1. Mascota</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label} htmlFor="qp-name">Nombre *</label>
            <input id="qp-name" name="patientName" className={field} placeholder="Ej. Luna" autoComplete="off" />
          </div>
          <div>
            <span className={label}>Especie *</span>
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Especie">
              {["Canino", "Felino", "Otro"].map(s => (
                <button key={s} type="button" aria-pressed={species === s} onClick={() => setSpecies(s)}
                  className={`py-2.5 font-sans text-[15px] border ${species === s ? "bg-salvia-700 border-salvia-700 text-bone" : "bg-white border-black/20 hover:border-salvia-700"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={label} htmlFor="qp-age">Edad</label>
            <input id="qp-age" name="age" className={field} placeholder="Ej. 3 años o 2 meses" autoComplete="off" />
          </div>
          <div>
            <label className={label} htmlFor="qp-owner">Tutor</label>
            <input id="qp-owner" name="ownerName" className={field} placeholder="Nombre del dueño" autoComplete="off" />
          </div>
        </div>
        {branches.length > 1 && (
          <div>
            <label className={label} htmlFor="qp-branch">Sede *</label>
            <select id="qp-branch" name="branchId" required defaultValue="" className={field}>
              <option value="">¿De qué sede la recogemos?</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name} — {b.address}</option>)}
            </select>
          </div>
        )}
        <details className="group">
          <summary className="cursor-pointer font-mono text-[9px] tracking-[0.18em] uppercase text-salvia-700">Más datos (opcional)</summary>
          <div className="grid gap-4 sm:grid-cols-2 mt-3">
            <div><label className={label} htmlFor="qp-breed">Raza</label><input id="qp-breed" name="breed" className={field} /></div>
            <div>
              <label className={label} htmlFor="qp-sex">Sexo</label>
              <select id="qp-sex" name="sex" className={field} defaultValue=""><option value="">ND</option><option value="M">Macho</option><option value="H">Hembra</option></select>
            </div>
            <div><label className={label} htmlFor="qp-vet">Veterinario que solicita</label><input id="qp-vet" name="requestingVet" className={field} /></div>
            <div><label className={label} htmlFor="qp-notes">Observaciones</label><input id="qp-notes" name="notes" className={field} /></div>
          </div>
        </details>
      </section>

      {/* 2. Exámenes */}
      <section className="border border-black/10 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-[20px] font-medium">2. Exámenes</h2>
          <span className="font-sans text-[13px] text-ink-2">{selected.length ? `${selected.length} elegido${selected.length > 1 ? "s" : ""}` : "Toca para elegir"}</span>
        </div>
        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
          {featured.map(t => {
            const on = selected.includes(t.id)
            return (
              <button key={t.id} type="button" aria-pressed={on} onClick={() => toggle(t.id)} className={tile(on)}>
                <span className="flex items-start justify-between gap-2">
                  <span className="font-sans text-[15px] font-medium leading-snug">{short(t.name)}</span>
                  <span aria-hidden className={`mt-0.5 w-5 h-5 shrink-0 border grid place-items-center text-[12px] ${on ? "border-bone" : "border-black/30"}`}>{on ? "✓" : ""}</span>
                </span>
                {t.isCustom && <span className={`block font-mono text-[8px] tracking-[0.15em] uppercase mt-1 ${on ? "text-salvia-200" : "text-amber-800"}`}>Tu perfil personalizado</span>}
              </button>
            )
          })}
        </div>

        {/* Elegidos que no están entre los más pedidos */}
        {selected.filter(id => !featuredIds.includes(id)).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selected.filter(id => !featuredIds.includes(id)).map(id => (
              <button key={id} type="button" onClick={() => toggle(id)} className="font-sans text-[13px] bg-salvia-700 text-bone px-3 py-1.5">
                {short(byId.get(id)?.name ?? "")} ✕
              </button>
            ))}
          </div>
        )}

        <button type="button" onClick={() => setShowAll(v => !v)} aria-expanded={showAll}
          className="font-mono text-[10px] tracking-[0.18em] uppercase text-salvia-700 border border-salvia-700/40 px-4 py-2.5 hover:bg-salvia-50">
          {showAll ? "Ocultar el catálogo" : `Ver todos los exámenes (${templates.length})`}
        </button>
        {showAll && (
          <div className="space-y-4">
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar examen…" className={field} aria-label="Buscar examen" />
            {rest.map(g => (
              <div key={g.area}>
                <p className="font-mono text-[8px] tracking-[0.18em] text-ink-2 uppercase mb-1.5">{g.area}</p>
                <div className="grid gap-1 sm:grid-cols-2">
                  {g.items.map(t => (
                    <label key={t.id} className="flex items-start gap-2.5 py-1 cursor-pointer font-sans text-sm">
                      <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggle(t.id)} className="mt-0.5 w-4 h-4 accent-salvia-700" />
                      <span>{short(t.name)}{t.description && <span className="block text-[11px] text-ink-2">Incluye: {t.description}</span>}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {rest.length === 0 && <p className="font-sans text-sm text-ink-2">No hay exámenes con ese nombre.</p>}
          </div>
        )}
      </section>

      {/* 3. Listo */}
      <section className="space-y-3">
        <label className="flex items-start gap-2.5 bg-salvia-50 border border-salvia-700/20 px-4 py-3 font-sans text-sm text-ink cursor-pointer">
          <input type="checkbox" name="sampleReady" value="1" className="mt-0.5 w-4 h-4 accent-salvia-700" />
          <span>
            La muestra ya está tomada y lista para entregar.
            <span className="block text-[12px] text-ink-2">El mensajero no puede esperar: si no está lista cuando llegue, se pierde la garantía.</span>
          </span>
        </label>
        {error && <p role="alert" className="font-sans text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">{error}</p>}
        <button type="submit" disabled={pending}
          className="w-full sm:w-auto bg-salvia-700 text-bone font-mono text-[11px] tracking-[0.2em] uppercase px-8 py-4 hover:bg-salvia-800 transition-colors disabled:opacity-60">
          {pending ? "Pidiendo…" : submitLabel}
        </button>
      </section>
    </form>
  )
}
