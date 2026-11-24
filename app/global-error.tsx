"use client"
// Último recurso si falla el layout principal: reemplaza el "Application error" genérico de Next por un mensaje en
// español con el detalle y un botón para recargar. Lleva su propio <html> porque reemplaza el layout raíz.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es" translate="no">
      <body style={{ margin: 0, background: "#faf6ee", color: "#1a1a18", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", padding: "48px 20px" }}>
          <p style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: "#b91c1c", margin: 0 }}>Algo salió mal</p>
          <h1 style={{ fontSize: 24, fontWeight: 500, margin: "6px 0 12px" }}>La página no se pudo cargar</h1>
          <p style={{ fontSize: 14, color: "#4a4a44" }}>
            Intenta de nuevo. Si sigue pasando, envía un pantallazo de esta página. Si el celular está traduciendo la
            página (Google Traductor), desactiva la traducción para este sitio.
          </p>
          <div style={{ marginTop: 16, padding: "10px 14px", background: "#fff", border: "1px solid rgba(0,0,0,.1)", fontFamily: "monospace", fontSize: 11, color: "#4a4a44", wordBreak: "break-word" }}>
            {!error.digest && error.message && <p style={{ margin: 0 }}>Detalle: {error.message}</p>}
            {error.digest && <p style={{ margin: 0 }}>Código: {error.digest}</p>}
          </div>
          <button
            type="button"
            onClick={() => reset()}
            style={{ marginTop: 20, background: "#3a4a3f", color: "#faf6ee", border: 0, padding: "12px 20px", fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer" }}
          >
            Intentar de nuevo
          </button>
        </div>
      </body>
    </html>
  )
}
