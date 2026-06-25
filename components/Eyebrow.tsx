import { ReactNode } from "react"

type Props = {
  children: ReactNode
  color?: string
  className?: string
}

export default function Eyebrow({ children, color, className = "" }: Props) {
  const style = color ? { color } : undefined
  return (
    <div
      className={`font-mono text-[10px] tracking-[0.26em] uppercase flex items-center gap-2.5 ${
        color ? "" : "text-salvia-700"
      } ${className}`}
      style={style}
    >
      <span
        className="w-5 h-px shrink-0"
        style={{ background: color ?? "currentColor" }}
      />
      {children}
    </div>
  )
}
