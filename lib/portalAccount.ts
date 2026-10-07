// Cuenta del Portal Vet de las clínicas creadas por el personal en /clientes: entran con el correo
// de la clínica y esta clave inicial (las que se registran solas en el portal eligen la suya).
export const DEFAULT_PORTAL_PASSWORD = "123456789"

// Cuentas antiguas creadas por el personal sin correo: email interno, entran con el nombre de la clínica
export const isInternalPortalEmail = (email: string) => email.endsWith("@portal.petslab")

export const normalizeEmail = (v: FormDataEntryValue | string | null) =>
  typeof v === "string" ? v.trim().toLowerCase() : ""

export const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
