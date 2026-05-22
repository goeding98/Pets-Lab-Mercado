"use client"
import { useTransition } from "react"
import { updateOrderStatus } from "@/actions/orders"

const NEXT_STATUS: Record<string, { label: string; next: string }> = {
  RECIBIDA: { label: "Marcar en proceso →", next: "EN_PROCESO" },
  EN_PROCESO: { label: "Marcar completada →", next: "COMPLETADA" },
}

export default function UpdateStatusButton({
  orderId,
  currentStatus,
}: {
  orderId: string
  currentStatus: string
}) {
  const [pending, startTransition] = useTransition()
  const cfg = NEXT_STATUS[currentStatus]
  if (!cfg) return null

  return (
    <button
      onClick={() => startTransition(() => updateOrderStatus(orderId, cfg.next))}
      disabled={pending}
      className="bg-azul-500 text-bone font-mono text-[10px] tracking-[0.18em] uppercase px-4 py-2.5 hover:bg-azul-600 transition-colors disabled:opacity-60"
    >
      {pending ? "…" : cfg.label}
    </button>
  )
}
