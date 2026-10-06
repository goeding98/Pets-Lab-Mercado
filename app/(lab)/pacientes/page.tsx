import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/db"

export const metadata: Metadata = { title: "Pacientes" }

// Pacientes: no hay tabla propia, los datos van en cada muestra (Order). Se agrupan por paciente +
// especie + tutor + clínica; los datos que se muestran son los de la muestra más reciente. Un error de
// digitación aparece como otro paciente: se corrige con "Editar datos" en la muestra.

const SEX: Record<string, string> = { M: "Macho", H: "Hembra" }
const norm = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase().replace(/\s+/g, " ")

export default async function PacientesPage({ searchParams }: { searchParams: { q?: string; clinica?: string } }) {
  const [orders, clinics] = await Promise.all([
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, orderNumber: true, createdAt: true, patientName: true, species: true, breed: true, age: true,
        sex: true, ownerName: true, requestingVet: true, clinicId: true,
        clinic: { select: { name: true } }, branch: { select: { name: true } },
      },
    }),
    prisma.clinic.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ])

  type Row = { latest: (typeof orders)[number]; orders: (typeof orders)[number][] }
  const groups = new Map<string, Row>()
  for (const o of orders) {
    const key = [norm(o.patientName), o.species, norm(o.ownerName), o.clinicId ?? ""].join("|")
    const g = groups.get(key)
    if (g) g.orders.push(o)
    else groups.set(key, { latest: o, orders: [o] })
  }

  const q = norm(searchParams.q)
  const clinica = searchParams.clinica ?? ""
  const rows = Array.from(groups.values()).filter(({ latest: l, orders: os }) => {
    if (clinica === "none" ? l.clinicId !== null : clinica && l.clinicId !== clinica) return false
    if (!q) return true
    return [l.patientName, l.ownerName, l.clinic?.name, l.requestingVet, ...os.map(o => o.orderNumber)].some(v => norm(v).includes(q))
  })

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-6xl">
      <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Pacientes</p>
      <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] mt-1">Pacientes y clínica remitente</h1>
      <p className="font-sans text-sm text-ink-2 mt-2 mb-6 max-w-2xl">
        Cada paciente con sus datos y la clínica que lo envía. Si ves un nombre mal escrito o un paciente
        repetido, abre la muestra y usa <strong>Editar datos</strong>.
      </p>

      <form method="get" className="flex flex-wrap gap-3 mb-5">
        <input
          name="q"
          defaultValue={searchParams.q}
          placeholder="Buscar paciente, tutor, clínica, veterinario o N° de orden…"
          className="border border-black/20 bg-white px-3 py-2 text-sm font-sans flex-1 min-w-[220px] focus:outline-2 focus:outline-salvia-700"
        />
        <select name="clinica" defaultValue={clinica} className="border border-black/20 bg-white px-3 py-2 text-sm font-sans">
          <option value="">Todas las clínicas</option>
          <option value="none">Sin clínica</option>
          {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button type="submit" className="bg-salvia-700 text-bone font-mono text-[9px] tracking-[0.18em] uppercase px-4 py-2">Buscar</button>
      </form>

      <p className="font-mono text-[9px] tracking-[0.15em] text-ink-2 uppercase mb-2">{rows.length} pacientes</p>
      <div className="border border-black/10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-salvia-50 border-b border-black/10">
              {["Paciente", "Tutor", "Clínica remitente", "Veterinario", "Muestras", "Última"].map(h => (
                <th key={h} className="text-left px-4 py-2.5 font-mono text-[8px] tracking-[0.18em] uppercase text-salvia-700">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ latest: l, orders: os }, i) => (
              <tr key={l.id} className={`border-b border-black/[0.06] align-top ${i % 2 ? "bg-black/[0.015]" : ""}`}>
                <td className="px-4 py-3">
                  <p className="font-sans text-sm font-medium text-ink">{l.patientName}</p>
                  <p className="font-sans text-[11px] text-ink-2">
                    {[l.species, l.breed, l.age, l.sex ? SEX[l.sex] ?? l.sex : null].filter(Boolean).join(" · ")}
                  </p>
                </td>
                <td className="px-4 py-3 font-sans text-xs text-ink">{l.ownerName ?? "—"}</td>
                <td className="px-4 py-3 font-sans text-xs text-ink">
                  {l.clinic?.name ?? "—"}
                  {l.branch && <span className="block font-mono text-[8px] tracking-[0.12em] uppercase text-salvia-700 mt-0.5">Sede {l.branch.name}</span>}
                </td>
                <td className="px-4 py-3 font-sans text-xs text-ink-2">{l.requestingVet ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-x-2 gap-y-1 max-w-[220px]">
                    {os.map(o => (
                      <Link key={o.id} href={`/muestras/${o.id}`} className="font-mono text-[10px] text-salvia-700 hover:underline">
                        {o.orderNumber}
                      </Link>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-[10px] text-ink-2 whitespace-nowrap">
                  {new Date(l.createdAt).toLocaleDateString("es-CO")}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center font-sans text-xs text-ink-2">No hay pacientes que coincidan.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
