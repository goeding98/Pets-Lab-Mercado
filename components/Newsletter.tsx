"use client"

import { useState } from "react"
import Eyebrow from "./Eyebrow"

export default function Newsletter() {
  const [email, setEmail] = useState("")
  const [toast, setToast] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: integrar Mailchimp o similar
    setEmail("")
    setToast(true)
    setTimeout(() => setToast(false), 4000)
  }

  return (
    <section className="bg-bone py-14 md:py-16">
      <div className="max-w-wrap mx-auto px-6 lg:px-10 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <Eyebrow>Newsletter</Eyebrow>
          <p className="font-serif text-[26px] md:text-[30px] font-medium tracking-[-0.02em] leading-tight mt-3 max-w-[360px]">
            Una nota mensual sobre{" "}
            <em className="italic text-salvia-700">salud preventiva</em>.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            className="flex-1 border border-ink bg-bone px-3.5 py-3 font-sans text-xs text-ink-2 placeholder:text-ink-2/60 focus:outline-2 focus:outline-salvia-700 min-w-0"
          />
          <button
            type="submit"
            className="font-mono text-[10px] tracking-[0.22em] uppercase bg-salvia-700 text-bone px-5 py-3 hover:opacity-90 transition-opacity focus:outline-2 focus:outline-salvia-700 shrink-0"
          >
            Suscribir →
          </button>
        </form>
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-ink text-bone font-mono text-[10px] tracking-[0.18em] uppercase px-6 py-3 shadow-lg"
        >
          ¡Gracias! Te escribiremos pronto.
        </div>
      )}
    </section>
  )
}
