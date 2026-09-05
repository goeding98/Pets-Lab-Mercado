export function computeDiscountAmount(price: number, discountType: string, discountValue: number): number {
  if (discountType === "PORCENTAJE") return (price * discountValue) / 100
  return discountValue
}

export function computeNetPrice(price: number, discountType: string, discountValue: number): number {
  const discount = computeDiscountAmount(price, discountType, discountValue)
  return Math.max(price - discount, 0)
}

export function getPaymentStatus(netPrice: number, amountPaid: number): { label: string; className: string } {
  if (netPrice <= 0) return { label: "—", className: "bg-black/10 text-ink" }
  if (amountPaid <= 0) return { label: "No pagado", className: "bg-black/10 text-ink" }
  if (amountPaid >= netPrice) return { label: "Pagado", className: "bg-azul-700 text-bone" }
  return { label: "Parcial", className: "bg-azul-100 text-azul-800" }
}
