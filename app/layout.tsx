import type { Metadata } from "next"
import { Fraunces, DM_Sans, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
})
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
})
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: { template: "%s — Pets & Lab LIMS", default: "Pets & Lab LIMS" },
  description: "Sistema de gestión de laboratorio veterinario",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fraunces.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
