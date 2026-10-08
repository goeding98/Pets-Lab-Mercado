import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"
import ExamResultForm from "./ExamResultForm"
import { isOrinaSection } from "@/lib/orina"
import { getOrinaConfig } from "@/lib/settings"
import UpdateStatusButton from "./UpdateStatusButton"
import PaymentModule from "./PaymentModule"
import { orderPayment } from "@/lib/payment"
import { catalogWhere } from "@/lib/catalog"
import { AddExam, ExamChanger } from "./ExamChanger"
import OrderInfoEditor from "./OrderInfoEditor"
import WhatsAppButton from "./WhatsAppButton"
import ExamTabs from "./ExamTabs"
import DeleteOrderButton from "./DeleteOrderButton"
import { TrackOpenSample } from "@/components/OpenSamplesBar"
import { headers } from "next/headers"
import { makeShareToken } from "@/lib/shareLink"
import { formatCOP } from "@/lib/payment"

export const metadata: Metadata = { title: "Detalle de muestra" }

export default async function MuestraDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      clinic: true,
      branch: true,
      processedBy: true,
      exams: {
        // Orden fijo: sin esto Postgres devuelve primero o al final el examen recién actualizado
        // y las tarjetas cambian de lugar al guardar (parece que "se borra" lo digitado).
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        include: {
          template: {
            include: {
              sections: {
                orderBy: { order: "asc" },
                include: {
                  fields: { orderBy: { order: "asc" } },
                },
              },
            },
          },
          results: true,
          photos: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, role: true } },
        },
      },
    },
  })

  if (!order) notFound()

  const session = await getServerSession(authOptions)
  const canEdit = can(session?.user.role, "resultados.editar")
  const payment = orderPayment(order.exams, order.clinic?.noCharge ?? false)
  // Corregir exámenes de la muestra (personal): catálogo disponible para la clínica de la orden
  const canChangeExams = can(session?.user.role, "muestras.crear")
  const catalog = canChangeExams
    ? await prisma.examTemplate.findMany({
        where: catalogWhere(order.clinicId),
        orderBy: [{ area: "asc" }, { name: "asc" }],
        select: { id: true, name: true, area: true, price: true, isCustom: true },
      })
    : []
  // Enviar por WhatsApp: enlace firmado al PDF (sin sesión) + número de la sede o de la clínica
  const host = headers().get("host") ?? "www.petslab.com.co"
  const base = `${host.startsWith("localhost") ? "http" : "https"}://${host}`
  const wa = {
    phone: order.branch?.phone || order.clinic?.phone || null,
    clinicId: order.clinicId,
    branchId: order.branchId,
    canSavePhone: can(session?.user.role, "clientes.editar"),
    greetingName: order.requestingVet || order.clinic?.contactName || order.clinic?.name || null,
    patientName: order.patientName,
    orderNumber: order.orderNumber,
    blockedReason: payment.released ? undefined : `Resultado retenido: pendiente de pago (${formatCOP(payment.balance)})`,
  }
  const clinicOptions = canChangeExams
    ? await prisma.clinic.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, branches: { orderBy: { createdAt: "asc" }, select: { id: true, name: true, address: true } } },
      })
    : []

  // Parcial de Orina: valores de referencia (configurables) y reactivos con lote del inventario
  const hasOrina = order.exams.some(e => e.template.sections.some(s => isOrinaSection(s.name)))
  const [orinaConfig, reagentItems] = hasOrina
    ? await Promise.all([
        getOrinaConfig(),
        prisma.inventoryItem.findMany({ where: { lot: { not: null }, expiresAt: { not: null } }, orderBy: { name: "asc" } }),
      ])
    : [undefined, []]
  const reagents = reagentItems.map(r => ({
    id: r.id, nombre: r.name, marca: r.brand ?? "", lote: r.lot ?? "", vence: r.expiresAt!.toISOString().slice(0, 10),
  }))

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/muestras" className="font-mono text-[9px] tracking-[0.18em] text-ink-2 hover:text-ink uppercase">
              ← Muestras
            </Link>
            <span className="text-black/20">/</span>
            <span className="font-mono text-[9px] tracking-[0.18em] text-salvia-700 uppercase">{order.orderNumber}</span>
            {order.source === "PORTAL" && (
              <span className="font-mono text-[8px] tracking-[0.18em] uppercase bg-amber-100 text-amber-900 px-2 py-0.5">
                {order.status === "SOLICITADA" ? "Solicitada por la clínica · muestra sin recibir" : "Solicitada desde Portal Vet"}
              </span>
            )}
          </div>
          <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em]">
            {order.patientName}
            <span className="font-sans text-base font-normal text-ink-2 ml-2">({order.species})</span>
          </h1>
          <div className="flex gap-4 mt-1 font-mono text-[9px] tracking-[0.15em] text-ink-2 uppercase">
            {order.breed && <span>{order.breed}</span>}
            {order.age && <span>{order.age}</span>}
            {order.sex && <span>{order.sex === "M" ? "Macho" : "Hembra"}</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {canChangeExams && (
            <OrderInfoEditor
              orderId={order.id}
              clinics={clinicOptions}
              initial={{
                patientName: order.patientName, species: order.species, breed: order.breed ?? "", age: order.age ?? "",
                sex: order.sex ?? "", ownerName: order.ownerName ?? "", requestingVet: order.requestingVet ?? "",
                clinicId: order.clinicId ?? "", branchId: order.branchId ?? "",
              }}
            />
          )}
          {can(session?.user.role, "muestras.eliminar") && (
            <DeleteOrderButton
              orderId={order.id}
              orderNumber={order.orderNumber}
              patientName={order.patientName}
              summary={`${order.exams.length} ${order.exams.length === 1 ? "examen" : "exámenes"}: ${order.exams.map(e => e.template.name).join(", ")} · ${order.exams.filter(e => e.status === "COMPLETADO").length} completados · Total ${formatCOP(payment.total)}, pagado ${formatCOP(payment.paid)}`}
            />
          )}
          {canEdit && <UpdateStatusButton orderId={order.id} currentStatus={order.status} />}
          {order.status === "COMPLETADA" && (
            <a
              href={`/api/pdf/${order.id}`}
              target="_blank"
              className="bg-ink text-bone font-mono text-[10px] tracking-[0.18em] uppercase px-4 py-2.5 hover:bg-ink/80 transition-colors"
            >
              PDF →
            </a>
          )}
          {order.status === "COMPLETADA" && (
            <WhatsAppButton {...wa} shareUrl={`${base}/r/${makeShareToken({ kind: "o", id: order.id })}`} what="los resultados" />
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Clínica", value: order.clinic ? (order.branch ? `${order.clinic.name} · Sede ${order.branch.name}` : order.clinic.name) : "—" },
          { label: "Veterinario", value: order.requestingVet ?? "—" },
          { label: "Dueño", value: order.ownerName ?? "—" },
          { label: "Fecha", value: new Date(order.createdAt).toLocaleDateString("es-CO") },
        ].map(({ label, value }) => (
          <div key={label} className="bg-salvia-50 border border-black/[0.06] p-4">
            <p className="font-mono text-[8px] tracking-[0.2em] text-salvia-700 uppercase mb-1">{label}</p>
            <p className="font-sans text-sm text-ink">{value}</p>
          </div>
        ))}
      </div>

      <PaymentModule
        orderId={order.id}
        payment={payment}
        hasResults={order.exams.some(e => e.status === "COMPLETADO")}
        canMark={can(session?.user.role, "pagos")}
        clinicName={order.clinic?.name ?? null}
      />

      {order.notes && (
        <div className="bg-azul-50 border border-azul-200 px-4 py-3 mb-8">
          <p className="font-mono text-[8px] tracking-[0.2em] text-azul-700 uppercase mb-1">Observaciones</p>
          <p className="font-sans text-sm text-ink whitespace-pre-line">{order.notes}</p>
        </div>
      )}

      {/* Exams */}
      <div className="space-y-6">
        <TrackOpenSample id={order.id} orderNumber={order.orderNumber} patientName={order.patientName} />
        <ExamTabs
          orderId={order.id}
          tabs={order.exams.map(e => ({
            id: e.id,
            name: e.template.name,
            status: e.status,
            hasDraft: e.status !== "COMPLETADO" && (e.results.length > 0 || e.structured != null),
          }))}
        >
        {order.exams.map(exam => (
          <div key={`${exam.id}-${exam.templateId}`}>
            {canChangeExams && exam.status === "PENDIENTE" && !exam.uploadedPdfPath && (
              <ExamChanger
                examId={exam.id}
                templateId={exam.templateId}
                templateName={exam.template.name}
                currentPrice={exam.price}
                options={catalog}
                canRemove={order.exams.length > 1}
              />
            )}
            <ExamResultForm
              exam={{
                ...exam,
                photos: exam.photos.filter(p => !p.role),
                macroPhoto: exam.photos.find(p => p.role === "COPRO_MACRO") ?? null,
              }}
              species={order.species}
              readOnly={!canEdit}
              released={payment.released}
              balance={payment.balance}
              orinaConfig={orinaConfig}
              reagents={reagents}
            />
            {exam.status === "COMPLETADO" && (
              <div className="flex justify-end gap-2 mt-1.5">
                <a
                  href={`/api/pdf/exam/${exam.id}`}
                  target="_blank"
                  className="font-mono text-[9px] tracking-[0.18em] text-ink-2 hover:text-ink uppercase border border-black/15 px-3 py-1.5 hover:bg-black/[0.03] transition-colors"
                >
                  {exam.uploadedPdfPath ? "PDF adjunto →" : "PDF individual →"}
                </a>
                <WhatsAppButton
                  {...wa}
                  small
                  shareUrl={`${base}/r/${makeShareToken({ kind: "e", id: exam.id })}`}
                  what={`el resultado de ${exam.template.name}`}
                />
              </div>
            )}
          </div>
        ))}
        </ExamTabs>
        {canChangeExams && <AddExam orderId={order.id} options={catalog} />}
      </div>
    </div>
  )
}
