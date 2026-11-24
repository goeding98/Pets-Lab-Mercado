// Colores de la marca de una clínica para sus reportes (Clinic.brandPrimary / brandAccent). Sin dependencias: lo usan el
// navegador (detección al subir el logo, components/ClinicLogoPicker.tsx) y el servidor (PDF, components/PdfReport.tsx).

export const HEX = /^#[0-9a-f]{6}$/i

const toRgb = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
const toHex = (rgb: number[]) => "#" + rgb.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")

// t = 0 → el color; t = 1 → blanco
export const tint = (hex: string, t: number) => toHex(toRgb(hex).map(v => v + (255 - v) * t))
const shade = (hex: string, t: number) => toHex(toRgb(hex).map(v => v * (1 - t)))

function luminance(hex: string) {
  const [r, g, b] = toRgb(hex).map(v => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrastWithWhite = (hex: string) => 1.05 / (luminance(hex) + 0.05)

// El color principal lleva texto blanco encima (títulos de los exámenes): se oscurece hasta que se lea bien.
export function readableOnWhite(hex: string) {
  let c = hex
  for (let i = 0; i < 20 && contrastWithWhite(c) < 4.5; i++) c = shade(c, 0.08)
  return c
}

function hue(rgb: number[]) {
  const [r, g, b] = rgb.map(v => v / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  if (d === 0) return 0
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}
const hueDist = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b))

export type DetectedBrand = { primary: string; accent: string; busyBackground: boolean }

// Analiza los píxeles RGBA del logo: ignora fondo (blanco/transparente) y grises, agrupa los colores y toma los dos
// tonos más presentes. Principal = el más oscuro de los dos (lleva texto blanco); acento = el otro.
export function detectBrandColors(data: Uint8ClampedArray, width: number, height: number): DetectedBrand {
  const buckets = new Map<string, { n: number; sum: number[] }>()
  const darks = new Map<string, { n: number; sum: number[] }>()
  const step = Math.max(1, Math.floor(Math.sqrt((width * height) / 40000)))
  for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
    const i = (y * width + x) * 4
    if (data[i + 3] < 128) continue
    const rgb = [data[i], data[i + 1], data[i + 2]]
    const max = Math.max(...rgb), min = Math.min(...rgb)
    if (min > 235) continue // fondo blanco
    const target = max - min < 45 ? (max < 90 ? darks : null) : buckets // grises claros fuera; negros aparte
    if (!target) continue
    const key = rgb.map(v => v >> 5).join(",")
    const b = target.get(key) ?? { n: 0, sum: [0, 0, 0] }
    b.n++; rgb.forEach((v, k) => (b.sum[k] += v))
    target.set(key, b)
  }
  const avg = (b: { n: number; sum: number[] }) => toHex(b.sum.map(v => v / b.n))
  const ranked = [...buckets.values()].sort((a, b) => b.n - a.n)
  // Grupos por tono: el primer grupo es el color dominante; el segundo, el primero que se aleja >30° de tono
  const groups: { n: number; sum: number[]; hue: number }[] = []
  for (const b of ranked) {
    const h = hue(b.sum.map(v => v / b.n))
    const g = groups.find(x => hueDist(x.hue, h) <= 30)
    if (g) { g.n += b.n; b.sum.forEach((v, k) => (g.sum[k] += v)) } else groups.push({ n: b.n, sum: [...b.sum], hue: h })
  }
  groups.sort((a, b) => b.n - a.n)
  const main = groups[0], second = groups.find(g => g !== main && g.n >= main.n * 0.12)

  let primary: string, accent: string
  if (!main) {
    // Logo sin colores (negro/gris): principal = su tono oscuro, acento igual
    const dark = [...darks.values()].sort((a, b) => b.n - a.n)[0]
    primary = dark ? avg(dark) : "#3a4a3f"
    accent = primary
  } else if (!second) {
    primary = avg(main)
    accent = avg(main)
  } else {
    const [a, b] = [avg(main), avg(second)]
    ;[primary, accent] = luminance(a) <= luminance(b) ? [a, b] : [b, a]
  }

  // Fondo con color o dibujos (ej. huellitas de un pantallazo): más del 5 % de una franja del borde no es blanco ni
  // transparente. Un logo limpio deja ese borde vacío (~1 %); un fondo de color sólido lo llena.
  const band = Math.max(2, Math.round(Math.min(width, height) * 0.03))
  let edge = 0, busy = 0
  for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) {
    if (x >= band && x < width - band && y >= band && y < height - band) continue
    const i = (y * width + x) * 4
    edge++
    if (data[i + 3] >= 20 && Math.min(data[i], data[i + 1], data[i + 2]) < 245) busy++
  }

  return { primary: readableOnWhite(primary), accent, busyBackground: edge > 0 && busy / edge > 0.05 }
}

// Caja del contenido del logo (sin márgenes blancos o transparentes), para recortarlo antes de guardarlo
export function contentBounds(data: Uint8ClampedArray, width: number, height: number) {
  let x0 = width, y0 = height, x1 = -1, y1 = -1
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4
    if (data[i + 3] < 20 || Math.min(data[i], data[i + 1], data[i + 2]) >= 245) continue
    if (x < x0) x0 = x
    if (x > x1) x1 = x
    if (y < y0) y0 = y
    if (y > y1) y1 = y
  }
  if (x1 < 0) return { x: 0, y: 0, w: width, h: height }
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.02)
  x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad)
  x1 = Math.min(width - 1, x1 + pad); y1 = Math.min(height - 1, y1 + pad)
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }
}

// Paleta del reporte a partir de los colores guardados (los valores se vuelven a validar aquí)
export function reportPalette(primary: string | null | undefined, accent: string | null | undefined) {
  const p = readableOnWhite(primary && HEX.test(primary) ? primary : "#3a4a3f")
  const a = accent && HEX.test(accent) ? accent : p
  return { primary: p, accent: a, light: tint(p, 0.93), border: tint(p, 0.86), onPrimaryMuted: tint(a, 0.55) }
}
