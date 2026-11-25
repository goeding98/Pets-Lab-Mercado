import type { Metadata } from "next"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { can } from "@/lib/permissions"
import { prisma } from "@/lib/db"
import { MENSAJEROS } from "@/lib/messengerRoutes"
import { BONO_PAQUETE, COLOR_COOKIE, DIA_COOKIE, loadDay } from "@/lib/routeDay"
import { ColorPicker, UnlockForm } from "./Gate"
import DayRoute from "./DayRoute"

export const metadata: Metadata = { title: "Día a día" }
export const dynamic = "force-dynamic"

// "Día a día" del mensajero (permiso diaadia: ADMIN y DOMICILIARIO), con candado por código mientras se prueba
export default async function DiaADiaPage() {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "diaadia")) redirect("/muestras")

  const jar = cookies()
  const colors = MENSAJEROS.slice(0, 2)
  const head = (
    <div className="mb-5">
      <p className="font-mono text-[9px] tracking-[0.22em] text-salvia-700 uppercase">Mensajeros</p>
      <h1 className="font-serif text-[26px] font-medium tracking-[-0.02em] mt-1">Día a día</h1>
    </div>
  )
  if (jar.get(DIA_COOKIE)?.value !== "1") return <div className="px-4 py-6 md:px-8 md:py-8">{head}<UnlockForm /></div>
  const color = jar.get(COLOR_COOKIE)?.value
  if (!color || !MENSAJEROS.some(m => m.nombre === color)) return <div className="px-4 py-6 md:px-8 md:py-8">{head}<ColorPicker options={colors} /></div>

  const [d, templates, top] = await Promise.all([
    loadDay(session.user.id, color),
    prisma.examTemplate.findMany({
      where: { active: true },
      orderBy: [{ area: "asc" }, { name: "asc" }],
      select: { id: true, name: true, area: true, description: true, isCustom: true, clients: { select: { id: true } } },
    }),
    // Los 10 más pedidos en 90 días: botones de un toque al registrar
    prisma.orderExam.groupBy({
      by: ["templateId"],
      where: { order: { createdAt: { gte: new Date(Date.now() - 90 * 86400_000) } } },
      _count: true,
      orderBy: { _count: { templateId: "desc" } },
      take: 40,
    }),
  ])

  return (
    <div className="px-4 py-4 md:px-8 md:py-6">
      <DayRoute
        d={d}
        templates={templates.map(t => ({ id: t.id, name: t.name, area: t.area, description: t.description, isCustom: t.isCustom, clientIds: t.clients.map(c => c.id) }))}
        topIds={top.map(g => g.templateId)}
        colors={colors}
        bono={BONO_PAQUETE}
      />
    </div>
  )
}
