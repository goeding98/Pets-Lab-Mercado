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

const DESCRIPTION =
  "Laboratorio veterinario en Cali: hematología, química sanguínea, perfiles, citología, urianálisis y PCR para perros y gatos. Resultados en línea para clínicas."

export const metadata: Metadata = {
  metadataBase: new URL("https://www.petslab.com.co"),
  title: { template: "%s — Pets & Lab", default: "Pets & Lab — Laboratorio veterinario en Cali" },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "es_CO",
    siteName: "Pets & Lab",
    title: "Pets & Lab — Laboratorio veterinario en Cali",
    description: DESCRIPTION,
  },
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
