type IconProps = {
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
}

function I({
  children,
  size = 24,
  color = "currentColor",
  strokeWidth = 1.6,
  className,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {children}
    </svg>
  )
}

export function IconDrop(p: IconProps) {
  return (
    <I {...p}>
      <path d="M12 3 C 7 10, 5 13, 5 16 a7 7 0 0 0 14 0 c 0-3 -2-6 -7-13 z" />
      <path d="M9 16 a3 3 0 0 0 3 3" />
    </I>
  )
}

export function IconTube(p: IconProps) {
  return (
    <I {...p}>
      <path d="M9 2 h6 v15 a3 3 0 0 1 -6 0 z" />
      <path d="M9 13 h6" />
      <path d="M9 2 h6" strokeWidth={2.4} />
    </I>
  )
}

export function IconScope(p: IconProps) {
  return (
    <I {...p}>
      <path d="M5 21 h14" />
      <path d="M9 21 v-3 h6 v3" />
      <path d="M12 18 v-4" />
      <circle cx="12" cy="9" r="3.5" />
      <path d="M12 5.5 V3 m -3 0 h6" />
    </I>
  )
}

export function IconBone(p: IconProps) {
  return (
    <I {...p}>
      <path d="M5.5 8.5 a2 2 0 1 1 2.5 -2.5 a2 2 0 1 1 2.5 2.5 l 4 4 a2 2 0 1 1 2.5 2.5 a2 2 0 1 1 -2.5 2.5 l-4 -4 a 2 2 0 1 1 -2.5 -2.5 a 2 2 0 1 1 -2.5 -2.5 z" />
    </I>
  )
}

export function IconPaw(p: IconProps) {
  return (
    <I {...p}>
      <circle cx="6" cy="9" r="1.6" />
      <circle cx="10" cy="6" r="1.6" />
      <circle cx="14" cy="6" r="1.6" />
      <circle cx="18" cy="9" r="1.6" />
      <path d="M8 15 c0-3 2-4 4-4 s 4 1 4 4 c 0 2 -2 4 -4 4 s -4 -2 -4 -4 z" />
    </I>
  )
}

export function IconSlide(p: IconProps) {
  return (
    <I {...p}>
      <rect x="6" y="3" width="12" height="18" rx="1" />
      <circle cx="12" cy="9" r="2.5" />
      <path d="M9.5 14 h5" />
      <path d="M9.5 17 h5" />
    </I>
  )
}

export function IconHeart(p: IconProps) {
  return (
    <I {...p}>
      <path d="M12 19 s -7-4 -7-10 a 4 4 0 0 1 7 -2 a 4 4 0 0 1 7 2 c 0 6 -7 10 -7 10 z" />
      <path d="M8 11 h2 l1-2 1 4 1-2 h3" />
    </I>
  )
}

export function IconClipboard(p: IconProps) {
  return (
    <I {...p}>
      <rect x="6" y="4" width="12" height="17" rx="1.5" />
      <path d="M9 4 v-1 a1 1 0 0 1 1 -1 h4 a1 1 0 0 1 1 1 v1" />
      <path d="M9 10 h6 M9 13 h6 M9 16 h4" />
    </I>
  )
}

export function IconFlask(p: IconProps) {
  return (
    <I {...p}>
      <path d="M9 3 h6" />
      <path d="M10 3 v6 l -5 9 a2 2 0 0 0 1.7 3 h10.6 a 2 2 0 0 0 1.7 -3 l -5 -9 v-6" />
      <path d="M7.2 14 h9.6" />
    </I>
  )
}

export function IconCalendar(p: IconProps) {
  return (
    <I {...p}>
      <rect x="4" y="5" width="16" height="15" rx="1.5" />
      <path d="M4 10 h16 M9 3 v4 M15 3 v4" />
    </I>
  )
}
