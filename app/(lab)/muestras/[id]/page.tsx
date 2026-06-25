import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db"
import ExamResultForm from "./ExamResultForm"
import UpdateStatusButton from "./UpdateStatusButton"

export const metadata: Metadata = { title: "Detalle de muestra" }

export default async function MuestraDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      clinic: true,
      processedBy: true,
      exams: {
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
        },
      },
    },
  })

  if (!order) notFound()

  return (
    <div className="px-8 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link href="/muestras" className="font-mono text-[9px] tracking-[0.18em] text-ink-2 hover:text-ink uppercase">
              ← Muestras
            </Link>
            <span className="text-black/20">/</span>
            <span className="font-mono text-[9px] tracking-[0.18em] text-salvia-700 uppercase">{order.orderNumber}</span>
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
        <div className="flex gap-2 shrink-0">
          <UpdateStatusButton orderId={order.id} currentStatus={order.status} />
          {order.status === "COMPLETADA" && (
            <a
              href={`/api/pdf/${order.id}`}
              target="_blank"
              className="bg-ink text-bone font-mono text-[10px] tracking-[0.18em] uppercase px-4 py-2.5 hover:bg-ink/80 transition-colors"
            >
              PDF →
            </a>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Clínica", value: order.clinic?.name ?? "—" },
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

      {order.notes && (
        <div className="bg-azul-50 border border-azul-200 px-4 py-3 mb-8">
          <p className="font-mono text-[8px] tracking-[0.2em] text-azul-700 uppercase mb-1">Observaciones</p>
          <p className="font-sans text-sm text-ink">{order.notes}</p>
        </div>
      )}

      {/* Exams */}
      <div className="space-y-6">
        {order.exams.map(exam => (
          <div key={exam.id}>
            <ExamResultForm exam={exam} />
            {exam.status === "COMPLETADO" && (
              <div className="flex justify-end mt-1.5">
                <a
                  href={`/api/pdf/exam/${exam.id}`}
                  target="_blank"
                  className="font-mono text-[9px] tracking-[0.18em] text-ink-2 hover:text-ink uppercase border border-black/15 px-3 py-1.5 hover:bg-black/[0.03] transition-colors"
                >
                  {exam.uploadedPdfPath ? "PDF adjunto →" : "PDF individual →"}
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
