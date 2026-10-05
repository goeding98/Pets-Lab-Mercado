// Pago de una orden y entrega del resultado a la clínica. Fuente única de la regla: la usan la página
// de la muestra, el listado, el Portal Vet y las rutas de PDF/fotos (el bloqueo es en el servidor).
// No hay un booleano "pagado" guardado: todo sale de Caja (precio neto vs. OrderExam.amountPaid).
// Sin imports de servidor: se usa también en el navegador.
import { computeNetPrice } from "./billing"

export type PayableExam = { price: number; discountType: string; discountValue: number; amountPaid: number }

export type OrderPayment = {
  total: number // suma de precios netos (con descuento)
  paid: number
  balance: number
  noCharge: boolean // cliente sin cobro (Clinic.noCharge, ej. Pets & Pets)
  fullyPaid: boolean
  // ¿La clínica puede ver el resultado? Cliente sin cobro, algún pago (parcial basta) o nada que cobrar.
  released: boolean
}

export function orderPayment(exams: PayableExam[], noCharge = false): OrderPayment {
  const total = exams.reduce((n, e) => n + computeNetPrice(e.price, e.discountType, e.discountValue), 0)
  const paid = exams.reduce((n, e) => n + e.amountPaid, 0)
  return {
    total,
    paid,
    balance: Math.max(total - paid, 0),
    noCharge,
    fullyPaid: paid >= total,
    released: noCharge || paid > 0 || total <= 0,
  }
}

export const formatCOP = (n: number) => n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })

export const PAYMENT_METHODS = [
  { value: "EFECTIVO", label: "Efectivo" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
] as const
