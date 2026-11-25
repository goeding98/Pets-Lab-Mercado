// Registrar una muestra desde el laboratorio: la usan "Nueva muestra" (actions/orders.ts: createOrder) y el "Día a día"
// del mensajero (actions/routeDay.ts). Precio de lista + descuento del cliente, sede validada, "Ya pagó" / "A crédito".
import type { Session } from "next-auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"
import { createWithOrderNumber, examsWithListPrice, resolveBranch } from "@/lib/orders"
import { computeNetPrice } from "@/lib/billing"
import { PAYMENT_METHODS } from "@/lib/payment"
import { assertOrderableTemplates } from "@/lib/catalog"

export async function createLabOrder(session: Session, formData: FormData) {
  const templateIds = formData.getAll("templateIds") as string[]
  const clinicIdRaw = formData.get("clinicId") as string
  const clinicId = clinicIdRaw && clinicIdRaw !== "" ? clinicIdRaw : null
  // Incluye los personalizados solo si son de esta clínica
  await assertOrderableTemplates(templateIds, clinicId)
  const branchId = await resolveBranch(clinicId, formData.get("branchId"))
  const listed = await examsWithListPrice(templateIds, clinicId)
  // "Ya pagó" al registrar (solo el personal con permiso de pagos): se registra el pago completo en Caja
  const method = formData.get("paymentMethod")
  const payMode = formData.get("payMode") ?? (formData.get("paid") === "1" ? "paid" : "")
  const paidUpfront = payMode === "paid" && can(session.user.role, "pagos")
    && PAYMENT_METHODS.some(m => m.value === method)
  // "A crédito": solo con línea activa del cliente (/credito); copia su plazo
  const creditLine = payMode === "credit" && clinicId && can(session.user.role, "pagos")
    ? await prisma.creditLine.findUnique({ where: { clinicId } })
    : null
  const creditDays = creditLine?.active ? creditLine.termDays : null
  const exams = paidUpfront
    ? listed.map(e => ({ ...e, amountPaid: computeNetPrice(e.price, e.discountType, e.discountValue), paymentTerm: "CONTADO", paymentMethod: method as string }))
    : creditDays != null
      ? listed.map(e => ({ ...e, paymentTerm: "CREDITO" }))
      : listed

  return createWithOrderNumber(orderNumber => prisma.order.create({
    data: {
      orderNumber,
      patientName: formData.get("patientName") as string,
      species: formData.get("species") as string,
      breed: (formData.get("breed") as string) || null,
      age: (formData.get("age") as string) || null,
      sex: (formData.get("sex") as string) || null,
      ownerName: (formData.get("ownerName") as string) || null,
      requestingVet: (formData.get("requestingVet") as string) || null,
      clinicId,
      branchId,
      processedById: session.user.id,
      creditDays,
      notes: (formData.get("notes") as string) || null,
      exams: {
        create: exams,
      },
    },
    select: { id: true, orderNumber: true, patientName: true },
  }))
}
