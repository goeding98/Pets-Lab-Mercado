"use client"
// Cuenta regresiva de la garantía de una recogida ("quedan 42 min"); se actualiza sola cada 20 s
import { useEffect, useState } from "react"

const fmt = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60000)), h = Math.floor(m / 60), r = m % 60
  return h ? `${h} h ${String(r).padStart(2, "0")} min` : `${r} min`
}

export default function Countdown({ deadline }: { deadline: string }) {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 20000)
    return () => clearInterval(t)
  }, [])
  if (now == null) return null
  const left = new Date(deadline).getTime() - now
  return <span className="font-mono tabular-nums">{left >= 0 ? `quedan ${fmt(left)}` : `vencida hace ${fmt(-left)}`}</span>
}
