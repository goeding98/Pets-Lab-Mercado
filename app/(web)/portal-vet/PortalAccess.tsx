"use client"

import { useState } from "react"
import ClinicLoginForm from "./ClinicLoginForm"
import ClinicRegisterForm from "./ClinicRegisterForm"

export default function PortalAccess() {
  const [tab, setTab] = useState<"login" | "registro">("login")

  return (
    <div className="bg-white border border-black/[0.08]">
      <div className="grid grid-cols-2 border-b border-black/[0.08]" role="tablist">
        {([
          ["login", "Ingresar"],
          ["registro", "Crear cuenta"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`font-mono text-[10px] tracking-[0.18em] uppercase py-3.5 transition-colors ${
              tab === key
                ? "text-ink border-b-[1.5px] border-salvia-700 -mb-px"
                : "text-ink-2 hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-8">
        {tab === "login" ? (
          <>
            <h2 className="font-serif text-[24px] font-medium tracking-[-0.02em] mb-6">Iniciar sesión</h2>
            <ClinicLoginForm />
            <p className="font-sans text-[12px] text-ink-2 mt-5">
              ¿Tu clínica aún no tiene cuenta?{" "}
              <button type="button" onClick={() => setTab("registro")} className="text-salvia-700 underline">
                Créala aquí
              </button>
            </p>
          </>
        ) : (
          <>
            <h2 className="font-serif text-[24px] font-medium tracking-[-0.02em] mb-6">Registra tu clínica</h2>
            <ClinicRegisterForm />
          </>
        )}
      </div>
    </div>
  )
}
