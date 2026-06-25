import { ReactNode } from "react"
import Link from "next/link"

type Variant = "primary" | "outline" | "outline-light"

type Props = {
  href?: string
  variant?: Variant
  children: ReactNode
  className?: string
  onClick?: () => void
  type?: "button" | "submit"
}

export default function Btn({
  href,
  variant = "primary",
  children,
  className = "",
  onClick,
  type = "button",
}: Props) {
  const base =
    "font-mono text-[10px] tracking-[0.22em] uppercase inline-block transition-opacity hover:opacity-80 focus:outline-2 focus:outline-salvia-700"

  const variants: Record<Variant, string> = {
    primary: "bg-salvia-700 text-bone px-5 py-3.5",
    outline: "border border-ink text-ink px-5 py-3.5",
    "outline-light": "border border-bone text-bone px-5 py-3.5",
  }

  const classes = `${base} ${variants[variant]} ${className}`

  if (onClick || type === "submit") {
    return (
      <button onClick={onClick} type={type} className={classes}>
        {children}
      </button>
    )
  }

  if (href?.startsWith("http")) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
        {children}
      </a>
    )
  }

  return (
    <Link href={href ?? "/"} className={classes}>
      {children}
    </Link>
  )
}
