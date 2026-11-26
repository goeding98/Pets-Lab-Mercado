"use client"
// Pantalla del mensajero en su vuelta (lib/routeDay.ts): la parada actual en grande y, debajo, la ruta en orden.
// En cada parada: "Llegué" → registra las muestras que le dan (o confirma con el doctor las del pedido del portal) →
// "Siguiente parada". No avanza solo: la parada se cierra cuando el mensajero termina.
import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import QuickPickupForm from "@/components/QuickPickupForm"
import Countdown from "@/app/(web)/portal-vet/dashboard/Countdown"
import { confirmPickup, finishRound, finishStop, registerVisitSample, reopenLastStop } from "@/actions/routeDay"
import { hora, type Vuelta } from "@/lib/messengerRoutes"
import type { DayStop, DoneStop } from "@/lib/routeDay"
import { ColorPicker } from "./Gate"

type Tpl = { id: string; name: string; area: string; description: string | null; isCustom: boolean; clientIds: string[] }
type Registered = { orderId?: string; orderNumber?: string; patientName?: string }

const peso = (v: number) => "$" + v.toLocaleString("es-CO")
const time = (iso: string) => new Date(iso).toLocaleTimeString("es-CO", { timeZone: "America/Bogota", hour: "numeric", minute: "2-digit" })
const RESULT: Record<string, { label: string; cls: string }> = {
  MUESTRAS: { label: "Muestras no agendadas", cls: "text-amber-800" },
  PEDIDO: { label: "Pedido recogido", cls: "text-salvia-700" },
  SIN_MUESTRAS: { label: "Sin muestras", cls: "text-ink-2" },
  ESPERA: { label: "No esperó", cls: "text-ink-2" },
  NO_LISTA: { label: "No estaba listo", cls: "text-red-700" },
}

export default function DayRoute({ d, templates, topIds, colors, bono, month }: {
  d: { color: string; hex: string; hasRoute: boolean; vuelta: number; vueltas: number; horario: Vuelta[]; todo: DayStop[]; done: DoneStop[]; bonusToday: number }
  templates: Tpl[]
  topIds: string[]
  colors: { nombre: string; color: string }[]
  bono: number
  month: { confirmed: number; pending: number; amount: number; paid: boolean }
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [phase, setPhase] = useState<"go" | "at" | "register" | "picked">("go")
  const [registered, setRegistered] = useState<Registered[]>([])
  const [checked, setChecked] = useState<string[]>([])
  const [late, setLate] = useState(false)
  const [waitSheet, setWaitSheet] = useState(false)
  const [msg, setMsg] = useState("")
  const [changing, setChanging] = useState(false)
  const [backSheet, setBackSheet] = useState(false)
  const [backWhy, setBackWhy] = useState("")
  const [backOther, setBackOther] = useState("")

  const cur = d.todo[0]
  const finishedDay = d.vueltas > 0 && d.vuelta > d.vueltas
  const sale = d.horario[d.vuelta - 1]
  const lastDone = d.done[d.done.length - 1]
  // Al cambiar de parada se limpia lo de la anterior. Si es una parada a la que se devolvió, sigue con lo que tenía:
  // sus muestras ya registradas y, si era un pedido ya recogido, en "recogido".
  const stopId = cur ? `${d.vuelta}|${cur.key}|${cur.reopen?.reason ?? ""}` : ""
  useEffect(() => {
    const r = cur?.reopen
    setRegistered(r ? r.orders.map(o => ({ orderId: o.orderId, orderNumber: o.orderNumber, patientName: o.patientName })) : [])
    setPhase(!r ? "go" : r.result === "PEDIDO" ? "picked" : r.orders.length ? "register" : "at")
    setChecked([]); setLate(false); setMsg("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopId])

  const forClinic = useMemo(() => {
    if (!cur) return { list: [] as Tpl[], featured: [] as string[] }
    const list = templates.filter(t => !t.isCustom || t.clientIds.includes(cur.clinicId))
    const ids = new Set(list.map(t => t.id))
    const custom = list.filter(t => t.isCustom).map(t => t.id)
    return { list, featured: [...custom, ...topIds.filter(id => ids.has(id) && !custom.includes(id)).slice(0, 10)] }
  }, [templates, topIds, cur])

  const run = (fn: () => Promise<{ error?: string } | undefined | void>) => start(async () => {
    setMsg("")
    const r = await fn().catch(() => ({ error: "No hubo conexión. Vuelve a tocar el botón." }))
    if (r && "error" in r && r.error) setMsg(r.error)
    else router.refresh()
  })
  const close = (result: "MUESTRAS" | "SIN_MUESTRAS" | "ESPERA" | "PEDIDO" | "NO_LISTA") => run(() => finishStop({
    vuelta: d.vuelta, color: d.color, clinicId: cur.clinicId, branchId: cur.branchId, name: cur.name, result,
    orderIds: [...(result === "PEDIDO" ? cur.pickup?.orders.map(o => o.id) ?? [] : []), ...registered.map(r => r.orderId!).filter(Boolean)],
    pickupId: cur.pickup?.id ?? null,
  }))

  const big = "w-full py-4 px-4 font-sans text-[16.5px] font-semibold text-center disabled:opacity-60"
  return (
    <div className="max-w-xl mx-auto">
      {/* Franja del mensajero */}
      <div className="text-white px-4 py-3" style={{ background: d.hex }}>
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="font-serif text-[24px] font-semibold">Mensajero {d.color}</h1>
          <button type="button" onClick={() => setChanging(v => !v)} className="font-mono text-[9px] tracking-[0.15em] uppercase underline opacity-90">Cambiar</button>
        </div>
        <p className="font-sans text-[13.5px] opacity-95">
          {finishedDay ? "Terminaste las vueltas de hoy" : d.vueltas ? `Vuelta ${d.vuelta} de ${d.vueltas}${sale ? ` · sale ${hora(sale.sale)}` : ""}` : "Sin vueltas en el plan"}
        </p>
        <div className="mt-2 flex justify-between gap-2 bg-black/20 px-3 py-1.5 font-sans text-[13.5px]">
          <span>Paquetes no agendados hoy</span>
          <b className="font-mono">{d.bonusToday} · {peso(d.bonusToday * bono)}</b>
        </div>
        <p className="mt-1 font-sans text-[12.5px] opacity-90">
          Este mes: {month.confirmed} confirmados · {peso(month.amount)}{month.pending ? ` · ${month.pending} por confirmar` : ""}{month.paid ? " · pagado" : ""}
        </p>
      </div>
      {changing && <div className="border border-black/10 bg-white p-4 mt-3"><ColorPicker options={colors} current={d.color} /></div>}

      <div className="py-4 space-y-4">
        {msg && <p role="alert" className="font-sans text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">{msg}</p>}

        {!d.hasRoute ? (
          <p className="font-sans text-sm text-ink-2 border border-black/10 bg-white p-4">No hay ruta para el Mensajero {d.color} en el plan de hoy. Elige otro mensajero.</p>
        ) : finishedDay ? (
          <div className="border-2 border-salvia-700 bg-white p-5 space-y-1">
            <p className="font-serif text-[22px] font-semibold">Listo por hoy</p>
            <p className="font-sans text-sm text-ink-2">Hiciste tus {d.vueltas} vueltas. Llevas {d.bonusToday} paquetes no agendados ({peso(d.bonusToday * bono)}).</p>
          </div>
        ) : !cur ? (
          <div className="border-2 border-ink bg-white">
            <div className="p-4 space-y-1">
              <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-ink-2">Fin de la vuelta {d.vuelta}</p>
              <p className="font-serif text-[22px] font-semibold">Vuelve al laboratorio</p>
              <p className="font-sans text-sm text-ink-2">Calle 10 #31-143, Colseguros · entrega todas las muestras.</p>
            </div>
            <div className="p-4 pt-0">
              <button type="button" disabled={pending} onClick={() => run(() => finishRound(d.vuelta, d.color))} className={`${big} bg-ink text-bone`}>
                Entregué en el laboratorio
              </button>
            </div>
          </div>
        ) : (
          <section className="border-2 border-ink bg-white" aria-live="polite">
            <div className="p-4 pb-2 flex items-start gap-3">
              <span className="w-9 h-9 shrink-0 rounded-full text-white font-sans font-bold grid place-items-center" style={{ background: d.hex }}>{d.done.length + 1}</span>
              <div className="min-w-0">
                <div className="flex flex-wrap gap-1.5 mb-1">
                  <span className={`font-mono text-[9px] tracking-[0.1em] uppercase px-1.5 py-0.5 border ${cur.pickup ? "text-azul-700 border-azul-700" : "text-ink-2 border-ink-2/50"}`}>{cur.pickup ? "Pedido por el portal" : "Ruta fija"}</span>
                  {cur.extra && <span className="font-mono text-[9px] tracking-[0.1em] uppercase px-1.5 py-0.5 border text-amber-800 border-amber-800">Nuevo en tu ruta</span>}
                </div>
                <h2 className="font-serif text-[22px] font-semibold leading-tight">{cur.name}</h2>
                <p className="font-sans text-sm text-ink-2">{[cur.address, cur.phone && `Tel. ${cur.phone}`].filter(Boolean).join(" · ")}</p>
              </div>
            </div>
            {cur.reopen && (
              <div className="mx-4 mt-1 px-3 py-2 bg-amber-50 border border-amber-200 font-sans text-[14px]">
                <b>Te devolviste a esta parada.</b> Motivo: {cur.reopen.reason}
              </div>
            )}
            {cur.pickup?.deadline && phase !== "picked" && (
              <div className="mx-4 mt-1 px-3 py-2 bg-salvia-50 font-sans text-[14px] flex justify-between gap-2">
                <span>Recoger antes de las <b>{time(cur.pickup.deadline)}</b></span>
                <Countdown deadline={cur.pickup.deadline} />
              </div>
            )}

            <div className="p-4 space-y-3">
              {phase === "go" && (
                <>
                  <button type="button" onClick={() => setPhase("at")} className={`${big} bg-ink text-bone`}>Llegué</button>
                  <p className="font-sans text-[13px] text-ink-2">{cur.pickup ? "Esta clínica pidió la recogida por el portal." : "Aunque nadie haya pedido, entras y preguntas si tienen muestras."}</p>
                </>
              )}

              {/* Ruta fija: preguntar */}
              {phase === "at" && !cur.pickup && (
                <>
                  <p className="font-sans text-[15px]">Pregunta: <i>«Buenos días, vengo de Pets &amp; Lab. ¿Tienen muestras para llevar?»</i></p>
                  <button type="button" onClick={() => setPhase("register")} className={`${big} bg-salvia-700 text-bone`}>Me dieron muestras: registrar</button>
                  <button type="button" disabled={pending} onClick={() => close("SIN_MUESTRAS")} className={`${big} border-[1.5px] border-ink`}>No tenían</button>
                  <button type="button" onClick={() => setWaitSheet(true)} className={`${big} border-[1.5px] border-dashed border-ink-2 text-ink-2 font-medium text-[15px] py-3`}>Me piden que espere</button>
                </>
              )}

              {/* Pedido del portal: confirmar con el doctor */}
              {phase === "at" && cur.pickup && (
                <>
                  <p className="font-sans text-[15px]">Muéstrale al doctor lo que pidió y confirma cada muestra:</p>
                  {cur.pickup.orders.map(o => {
                    const ok = checked.includes(o.id)
                    return (
                      <div key={o.id} className={`border px-3 py-3 ${ok ? "border-salvia-700 bg-salvia-50" : "border-black/15"}`}>
                        <p className="font-sans text-[15px]"><b>{o.patientName}</b> · {o.species}{o.age ? ` · ${o.age}` : ""}{o.ownerName ? ` · ${o.ownerName}` : ""}</p>
                        <p className="font-sans text-[13px] text-ink-2">{o.exams.join(", ")} · <span className="font-mono">{o.orderNumber}</span></p>
                        <p className="font-sans text-[13.5px] mt-1.5"><i>«Doc, ¿esta es la muestra de {o.patientName}?»</i></p>
                        <button type="button" onClick={() => setChecked(c => ok ? c.filter(x => x !== o.id) : [...c, o.id])}
                          className={`mt-2 w-full py-2.5 font-sans text-[15px] font-semibold ${ok ? "bg-salvia-700 text-bone" : "border border-salvia-700 text-salvia-700"}`}>
                          {ok ? "Confirmada ✓" : "Sí, es esta"}
                        </button>
                      </div>
                    )
                  })}
                  <button type="button" disabled={pending || checked.length < cur.pickup.orders.length}
                    onClick={() => start(async () => {
                      setMsg("")
                      const r = await confirmPickup(cur.pickup!.id).catch(() => ({ error: "No hubo conexión. Vuelve a tocar el botón." }) as { error?: string; late?: boolean })
                      if (r.error) setMsg(r.error); else { setLate(!!r.late); setPhase("picked") }
                    })}
                    className={`${big} bg-salvia-700 text-bone`}>
                    {checked.length < cur.pickup.orders.length ? `Confirma las ${cur.pickup.orders.length} muestras` : "Confirmar muestras"}
                  </button>
                  <button type="button" disabled={pending} onClick={() => close("NO_LISTA")} className={`${big} border-[1.5px] border-ink`}>No estaba lista</button>
                  <p className="font-sans text-[12.5px] text-ink-2">Si no está lista, no esperas: la clínica vuelve a pedir cuando la tenga.</p>
                </>
              )}

              {phase === "picked" && (
                <>
                  <p className={`font-sans text-[15px] px-3 py-2 ${late ? "bg-red-50 text-red-800" : "bg-salvia-50 text-salvia-800"}`}>
                    {late ? "Pedido recogido después de la garantía: la clínica recibe 50 % de descuento." : "Pedido recogido a tiempo."}
                  </p>
                  {registered.length > 0 && <RegisteredList items={registered} />}
                  <button type="button" onClick={() => setPhase("register")} className={`${big} border-[1.5px] border-salvia-700 text-salvia-700`}>Me dieron otra muestra: registrar</button>
                  <button type="button" disabled={pending} onClick={() => close("PEDIDO")} className={`${big} bg-ink text-bone`}>Siguiente parada</button>
                </>
              )}

              {phase === "register" && (
                <>
                  {registered.length > 0 && <RegisteredList items={registered} />}
                  <QuickPickupForm
                    key={registered.length}
                    templates={forClinic.list}
                    featuredIds={forClinic.featured}
                    action={registerVisitSample}
                    submitLabel={registered.length ? "Registrar otra muestra" : "Registrar muestra"}
                    requireReady={false}
                    extraHidden={{ clinicId: cur.clinicId, ...(cur.branchId ? { branchId: cur.branchId } : {}) }}
                    onDone={r => setRegistered(x => [...x, r])}
                  />
                  {cur.pickup ? (
                    <button type="button" disabled={pending} onClick={() => close("PEDIDO")} className={`${big} bg-ink text-bone`}>Siguiente parada</button>
                  ) : registered.length > 0 ? (
                    <button type="button" disabled={pending} onClick={() => close("MUESTRAS")} className={`${big} bg-ink text-bone`}>
                      Listo: siguiente parada ({registered.length} {registered.length === 1 ? "muestra" : "muestras"})
                    </button>
                  ) : (
                    <button type="button" onClick={() => setPhase("at")} className="font-mono text-[10px] tracking-[0.15em] uppercase text-ink-2 underline">Volver</button>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {/* Devolverse a la parada anterior (p. ej. iba saliendo y le dijeron que sí había muestras) */}
        {d.hasRoute && !finishedDay && lastDone && (
          <button type="button" onClick={() => { setBackWhy(""); setBackOther(""); setBackSheet(true) }}
            className="w-full py-3 border border-black/20 bg-white font-sans text-[14.5px] text-ink hover:border-ink">
            ↩ Devolverme a {lastDone.name}
          </button>
        )}

        {/* La ruta de la vuelta */}
        {d.hasRoute && !finishedDay && (
          <section>
            <p className="font-mono text-[9px] tracking-[0.18em] uppercase text-ink-2 mb-1">Tu ruta de esta vuelta, en orden</p>
            <ol className="divide-y divide-black/10 border-y border-black/10">
              {d.done.map((s, i) => (
                <li key={s.id} className="py-2.5 flex items-start gap-3">
                  <span className="w-7 h-7 shrink-0 rounded-full text-white font-sans text-xs font-bold grid place-items-center" style={{ background: d.hex }}>{i + 1}</span>
                  <span className="flex-1 min-w-0 font-sans text-[14.5px]">{s.name}
                    <span className={`block font-mono text-[10px] tracking-[0.06em] uppercase ${RESULT[s.result]?.cls ?? "text-ink-2"}`}>
                      {RESULT[s.result]?.label ?? s.result}{s.orders ? ` · ${s.orders}` : ""}{s.unscheduled ? ` · +${peso(bono)}` : ""}
                    </span>
                  </span>
                  <span className="font-mono text-[11px] text-ink-2">{time(s.at)}</span>
                </li>
              ))}
              {d.todo.map((s, i) => (
                <li key={s.key} className={`py-2.5 flex items-start gap-3 ${i === 0 ? "bg-black/[0.03] -mx-2 px-2" : ""}`}>
                  <span className="w-7 h-7 shrink-0 rounded-full border-2 font-sans text-xs font-bold grid place-items-center" style={{ borderColor: d.hex, color: d.hex }}>{d.done.length + i + 1}</span>
                  <span className="flex-1 min-w-0 font-sans text-[14.5px]">{s.name}
                    <span className="block font-sans text-[12.5px] text-ink-2">{s.address}{s.pickup ? ` · pedido: ${s.pickup.orders.map(o => o.patientName).join(", ")}` : ""}</span>
                  </span>
                  {i === 0 ? <span className="font-mono text-[10px] uppercase" style={{ color: d.hex }}>Ahora</span>
                    : s.pickup ? <span className="font-mono text-[10px] uppercase text-azul-700">Pedido</span> : null}
                </li>
              ))}
              <li className="py-2.5 flex items-start gap-3">
                <span className="w-7 h-7 shrink-0 rounded-full border-2 border-ink font-sans text-xs font-bold grid place-items-center">L</span>
                <span className="font-sans text-[14.5px]">Laboratorio<span className="block text-[12.5px] text-ink-2">Entregas las muestras y termina la vuelta</span></span>
              </li>
            </ol>
          </section>
        )}

        <details className="border border-black/10 bg-white">
          <summary className="px-4 py-3 font-sans font-semibold cursor-pointer">Las 4 reglas de la ruta</summary>
          <ol className="px-4 pb-4 pl-9 list-decimal font-sans text-sm space-y-1.5">
            <li>Pasas por todas tus clínicas, aunque nadie haya pedido. Entras y preguntas si tienen muestras.</li>
            <li>No te saltas ninguna: sigues el orden. Los pedidos nuevos ya vienen puestos en su lugar.</li>
            <li>No esperas. Si la muestra no está lista, sigues a la siguiente parada.</li>
            <li>Cada vuelta sale y termina en el laboratorio, a la hora de tu horario.</li>
          </ol>
        </details>
      </div>

      {backSheet && lastDone && (
        <div className="fixed inset-0 z-50 bg-black/45 grid items-end" onClick={e => { if (e.target === e.currentTarget) setBackSheet(false) }}>
          <div className="bg-bone max-w-xl w-full mx-auto p-5 space-y-3">
            <p className="font-serif text-[22px] font-semibold">¿Te devuelves a {lastDone.name}?</p>
            <p className="font-sans text-sm text-ink-2">La parada vuelve a quedar abierta y queda anotado por qué te devolviste. Elige el motivo:</p>
            <div className="grid gap-2">
              {["Salieron a decirme que sí había muestras", "Me equivoqué al marcar"].map(r => (
                <button key={r} type="button" onClick={() => setBackWhy(r)}
                  className={`text-left px-3 py-3 border font-sans text-[15px] ${backWhy === r ? "border-ink bg-white font-semibold" : "border-black/15 bg-white"}`}>
                  {r}
                </button>
              ))}
              <button type="button" onClick={() => setBackWhy("otro")}
                className={`text-left px-3 py-3 border font-sans text-[15px] ${backWhy === "otro" ? "border-ink bg-white font-semibold" : "border-black/15 bg-white"}`}>
                Otro motivo
              </button>
              {backWhy === "otro" && (
                <input autoFocus value={backOther} onChange={e => setBackOther(e.target.value)} placeholder="Escribe por qué te devuelves"
                  className="w-full border border-black/20 bg-white px-3 py-2.5 font-sans text-[15px] focus:outline-2 focus:outline-salvia-700" aria-label="Motivo" />
              )}
            </div>
            {msg && <p className="font-sans text-sm text-red-700">{msg}</p>}
            <button type="button" disabled={pending || !backWhy || (backWhy === "otro" && backOther.trim().length < 4)}
              onClick={() => start(async () => {
                setMsg("")
                const r = await reopenLastStop(backWhy === "otro" ? backOther : backWhy).catch(() => ({ error: "No hubo conexión. Vuelve a tocar el botón." }))
                if (r.error) setMsg(r.error); else { setBackSheet(false); router.refresh() }
              })}
              className={`${big} bg-ink text-bone`}>
              Devolverme
            </button>
            <button type="button" onClick={() => setBackSheet(false)} className="w-full py-2 font-mono text-[10px] tracking-[0.15em] uppercase text-ink-2 underline">Cancelar</button>
          </div>
        </div>
      )}

      {waitSheet && (
        <div className="fixed inset-0 z-50 bg-black/45 grid items-end" onClick={e => { if (e.target === e.currentTarget) setWaitSheet(false) }}>
          <div className="bg-bone max-w-xl w-full mx-auto p-5 space-y-3">
            <p className="font-serif text-[22px] font-semibold">No esperas</p>
            <p className="font-sans text-sm">Respóndeles con amabilidad y sigue tu ruta:</p>
            <p className="font-sans italic bg-white border-l-4 px-3 py-2" style={{ borderColor: d.hex }}>«Qué pena, no puedo esperar porque me esperan en las otras clínicas. Las recojo en mi próxima vuelta, o pidan la recogida por el Portal Vet cuando estén listas.»</p>
            <button type="button" disabled={pending} onClick={() => { setWaitSheet(false); close("ESPERA") }} className={`${big} bg-ink text-bone`}>Entendido, sigo</button>
          </div>
        </div>
      )}
    </div>
  )
}

function RegisteredList({ items }: { items: Registered[] }) {
  return (
    <div className="bg-salvia-50 border border-salvia-700/20 px-3 py-2 font-sans text-sm">
      <p className="font-mono text-[9px] tracking-[0.15em] uppercase text-salvia-700 mb-1">Registradas en esta parada</p>
      {items.map((r, i) => <p key={i}>✓ {r.patientName} <span className="font-mono text-[11px] text-ink-2">{r.orderNumber}</span></p>)}
    </div>
  )
}
