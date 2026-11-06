import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { canManageCredit, canSeeCartera } from "@/lib/permissions"
import { addDays, daysBetween, getClinicCredits, todayKey } from "@/lib/credit"
import { formatCOP } from "@/lib/payment"

export const metadata: Metadata = { title: "Cartera" }
export const dynamic = "force-dynamic"

const fmtDay = (d: string) => d.split("-").reverse().join("/")

// Cartera: quién debe a crédito y cuándo vence. Michel, Guillermo, Germán y Contabilidad (lib/permissions.ts)
export default async function CarteraPage({ searchParams }: { searchParams: { ver?: string } }) {
  const session = await getServerSession(authOptions)
  if (!canSeeCartera(session?.user.role, session?.user.email)) redirect("/dashboard")

  const credits = await getClinicCredits()
  const clinics = await prisma.clinic.findMany({ where: { id: { in: Array.from(credits.keys()) } }, select: { id: true, name: true, phone: true } })
  const names = new Map(clinics.map(c => [c.id, c]))
  const today = todayKey()
  const week = addDays(today, 7)

  const all = Array.from(credits.values())
    .filter(c => c.used > 0 || c.line?.active)
    .map(c => ({ ...c, name: names.get(c.clinicId)?.name ?? "—", phone: names.get(c.clinicId)?.phone ?? null }))
    .sort((a, b) => b.overdue - a.overdue || (a.nextDue ?? "9999").localeCompare(b.nextDue ?? "9999") || b.used - a.used)
  const ver = searchParams.ver === "mora" || searchParams.ver === "semana" ? searchParams.ver : "todos"
  const list = all.filter(c => ver === "mora" ? c.inMora : ver === "semana" ? c.orders.some(o => o.due >= today && o.due <= week) : true)

  const total = all.reduce((n, c) => n + c.used, 0)
  const overdue = all.reduce((n, c) => n + c.overdue, 0)
  const dueWeek = all.reduce((n, c) => n + c.orders.filter(o => o.due >= today && o.due <= week).reduce((m, o) => m + o.balance, 0), 0)
  const enMora = all.filter(c => c.inMora).length

  return (
    <div className="px-4 py-5 md:px-8 md:py-8 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Crédito</p>
          <h1 className="font-serif text-[24px] md:text-[28px] font-medium tracking-[-0.02em] mt-1">Cartera</h1>
          <p className="font-sans text-[13px] text-ink-2 mt-1">Órdenes a crédito con saldo pendiente. Cada factura vence a su plazo (15 o 30 días).</p>
        </div>
        {canManageCredit(session?.user.role, session?.user.email) && (
          <Link href="/credito" className="border border-salvia-700 text-salvia-700 font-mono text-[10px] tracking-[0.18em] uppercase px-4 py-2.5 hover:bg-salvia-50">
            Líneas de crédito →
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {([
          ["Por cobrar", formatCOP(total), ""],
          ["Vencido", formatCOP(overdue), overdue > 0 ? "text-red-700" : ""],
          ["Vence en 7 días", formatCOP(dueWeek), dueWeek > 0 ? "text-amber-800" : ""],
          ["Clientes en mora", String(enMora), enMora > 0 ? "text-red-700" : ""],
        ] as const).map(([l, v, cls]) => (
          <div key={l} className="border border-black/10 bg-white px-4 py-3">
            <p className="font-mono text-[8px] tracking-[0.18em] uppercase text-ink-2 mb-0.5">{l}</p>
            <p className={`font-sans text-lg md:text-xl font-medium ${cls || "text-ink"}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 sm:flex gap-2 mb-4">
        {([["todos", "Todos"], ["mora", "En mora"], ["semana", "Vence esta semana"]] as const).map(([k, l]) => (
          <Link key={k} href={k === "todos" ? "/cartera" : `/cartera?ver=${k}`}
            className={`text-center font-sans text-sm px-4 py-2.5 border transition-colors ${ver === k ? "bg-salvia-700 border-salvia-700 text-bone font-medium" : "bg-white border-black/20 text-ink hover:border-salvia-700"}`}>
            {l}
          </Link>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="border border-black/10 bg-white px-4 py-8 text-center font-sans text-sm text-ink-2">
          {ver === "todos" ? "Nadie debe a crédito." : "Ningún cliente en esta lista."}
        </p>
      ) : (
        <div className="space-y-2.5">
          {list.map(c => {
            const late = c.orders.filter(o => o.due < today)
            return (
              <Link key={c.clinicId} href={`/cartera/${c.clinicId}`}
                className={`block border bg-white px-4 py-3 hover:border-salvia-700 active:bg-salvia-50 ${c.inMora ? "border-red-300" : "border-black/10"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-sans text-[15px] font-medium text-ink">{c.name}</p>
                    <p className="font-sans text-xs text-ink-2 mt-0.5">
                      {c.line ? `Cupo ${formatCOP(c.line.limit)} · ${c.line.termDays} días${c.line.active ? "" : " · línea cerrada"}` : "Sin línea"}
                      {" · "}{c.orders.length} {c.orders.length === 1 ? "orden pendiente" : "órdenes pendientes"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-sans text-base font-medium text-ink">{formatCOP(c.used)}</p>
                    {c.overdue > 0 && <p className="font-sans text-xs text-red-700 font-medium">Vencido {formatCOP(c.overdue)}</p>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {c.inMora && (
                    <Tag cls="bg-red-100 text-red-800">En mora · {Math.max(...late.map(o => o.daysOverdue))} d</Tag>
                  )}
                  {c.overLimit && <Tag cls="bg-amber-100 text-amber-900">Sobre cupo</Tag>}
                  {!c.inMora && c.nextDue && (
                    <Tag cls={daysBetween(today, c.nextDue) <= 3 ? "bg-amber-100 text-amber-900" : "bg-black/[0.05] text-ink-2"}>
                      Próximo vence {fmtDay(c.nextDue)}
                    </Tag>
                  )}
                  {c.used === 0 && <Tag cls="bg-salvia-50 text-salvia-700">Al día</Tag>}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Tag({ cls, children }: { cls: string; children: React.ReactNode }) {
  return <span className={`font-mono text-[8px] tracking-[0.15em] uppercase px-2 py-0.5 ${cls}`}>{children}</span>
}
