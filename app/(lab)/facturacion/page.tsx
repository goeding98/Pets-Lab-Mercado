import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { formatCOP } from "@/lib/payment"
import { getInvoicing, type InvoiceFilter } from "@/lib/invoicing"
import ClientCard from "./ClientCard"

export const metadata: Metadata = { title: "Facturación" }
export const dynamic = "force-dynamic"

// Facturación (permiso "facturacion": ADMIN y CONTADOR). Todo lo que se debe facturar, por cliente,
// sin Pets & Pets (cliente sin cobro). Ver lib/invoicing.ts.
export default async function FacturacionPage({ searchParams }: { searchParams: { estado?: string; desde?: string; hasta?: string; cliente?: string } }) {
  const estado = (["pendientes", "facturadas", "todas"].includes(searchParams.estado ?? "") ? searchParams.estado : "pendientes") as InvoiceFilter["estado"]
  const filter: InvoiceFilter = { estado, desde: searchParams.desde, hasta: searchParams.hasta, cliente: searchParams.cliente }
  const [{ clients, totals }, clinicOptions] = await Promise.all([
    getInvoicing(filter),
    prisma.clinic.findMany({ where: { noCharge: false }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ])
  const qs = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ estado, ...(filter.desde ? { desde: filter.desde } : {}), ...(filter.hasta ? { hasta: filter.hasta } : {}), ...(filter.cliente ? { cliente: filter.cliente } : {}), ...patch })
    return `?${p}`
  }
  const missing = clients.filter(c => !c.isParticular && (!c.nit || !c.email || !c.address || !c.phone)).length

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
        <div>
          <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Facturación</p>
          <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">Órdenes por cliente</h1>
          <p className="font-sans text-sm text-ink-2 mt-1">Todas las órdenes con valor a cobrar, sin Pets &amp; Pets. Valor neto de Caja (precio de lista menos descuentos).</p>
        </div>
        <a href={`/facturacion/csv${qs({})}`} className="border border-black/20 font-mono text-[9px] tracking-[0.18em] uppercase px-4 py-2.5 hover:bg-black/[0.03]">
          Descargar para Excel (CSV) ↓
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {([["pendientes", "Por facturar"], ["facturadas", "Facturadas"], ["todas", "Todas"]] as const).map(([k, l]) => (
          <Link key={k} href={`/facturacion${qs({ estado: k })}`}
            className={`font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-2 border ${estado === k ? "bg-salvia-700 text-bone border-salvia-700" : "border-black/15 text-ink hover:bg-black/[0.03]"}`}>
            {l}
          </Link>
        ))}
        <form method="get" className="flex flex-wrap items-center gap-1.5 ml-auto">
          <input type="hidden" name="estado" value={estado} />
          <select name="cliente" defaultValue={filter.cliente ?? ""} className="border border-black/20 bg-white px-2 py-1.5 text-xs font-sans max-w-[200px]">
            <option value="">Todos los clientes</option>
            {clinicOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="particulares">Particulares (sin clínica)</option>
          </select>
          <input type="date" name="desde" defaultValue={filter.desde} className="border border-black/20 bg-white px-2 py-1.5 text-xs font-sans" />
          <span className="text-ink-2 text-xs">a</span>
          <input type="date" name="hasta" defaultValue={filter.hasta} className="border border-black/20 bg-white px-2 py-1.5 text-xs font-sans" />
          <button className="font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-2 border border-black/15 hover:bg-black/[0.03]">Filtrar</button>
          {(filter.desde || filter.hasta || filter.cliente) && (
            <Link href={`/facturacion?estado=${estado}`} className="font-mono text-[9px] tracking-[0.15em] uppercase text-ink-2 hover:underline px-1">Limpiar</Link>
          )}
        </form>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          [estado === "facturadas" ? "Facturado" : estado === "todas" ? "Valor total" : "Por facturar", formatCOP(totals.total)],
          ["Clientes", String(totals.clients)],
          ["Órdenes", String(totals.orders)],
          ["Saldo sin pagar", formatCOP(totals.balance)],
        ].map(([l, v]) => (
          <div key={l} className="bg-white border border-black/[0.08] px-4 py-3">
            <p className="font-mono text-[8px] tracking-[0.2em] uppercase text-salvia-700">{l}</p>
            <p className="font-serif text-[24px] font-medium tracking-[-0.02em] text-ink mt-1">{v}</p>
          </div>
        ))}
      </div>

      {missing > 0 && (
        <p className="font-sans text-xs text-amber-900 bg-amber-50 border border-amber-200 px-3 py-2 mb-4">
          {missing} {missing === 1 ? "cliente tiene" : "clientes tienen"} datos incompletos para la factura (en rojo). Se completan en Clientes → la clínica.
        </p>
      )}

      {clients.length === 0 ? (
        <p className="font-sans text-sm text-ink-2 border border-black/10 bg-salvia-50 px-4 py-8 text-center">
          {estado === "pendientes" ? "No hay nada pendiente por facturar con estos filtros." : "No hay órdenes con estos filtros."}
        </p>
      ) : (
        <div className="space-y-3">
          {clients.map(c => <ClientCard key={c.key} client={c} defaultOpen={clients.length <= 3} />)}
        </div>
      )}
    </div>
  )
}
