// Permisos por rol del personal del laboratorio. Se usa tanto en middleware (edge) como en
// páginas y server actions, así que este archivo no debe importar nada de servidor.

export type Permission =
  | "panel"             // /dashboard
  | "muestras.ver"      // listado y detalle de muestras, descargar PDFs
  | "muestras.crear"    // registrar una muestra nueva
  | "muestras.eliminar" // borrar una muestra (con motivo; queda registro en DeletedOrder): solo ADMIN
  | "resultados.editar" // capturar resultados, subir/quitar PDF, cambiar estado de la orden
  | "clientes.ver"
  | "clientes.editar"   // crear/editar clínicas (y su usuario del portal)
  | "caja"
  | "facturacion"       // /facturacion: órdenes por facturar (sin Pets & Pets), marcar facturadas — ADMIN y CONTADOR
  | "pagos"             // marcar una orden como pagada (libera el resultado a la clínica): todo el personal
  | "inventario"
  | "usuarios"
  | "promociones"       // crear/eliminar promociones (exámenes combinados)
  | "personalizados"    // exámenes personalizados por cliente (/personalizados): médicos, microbiólogos y comercial
  | "rangos"            // rangos de referencia de los exámenes maestros (solo ADMIN: jefe médico y administradores)

const ALL: Permission[] = [
  "panel", "muestras.ver", "muestras.crear", "muestras.eliminar", "resultados.editar",
  "clientes.ver", "clientes.editar", "caja", "facturacion", "pagos", "inventario", "usuarios", "promociones", "personalizados", "rangos",
]

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: ALL,
  STAFF: ALL.filter(p => p !== "usuarios" && p !== "promociones" && p !== "rangos" && p !== "muestras.eliminar" && p !== "facturacion"),
  COMERCIAL: ["panel", "muestras.ver", "muestras.crear", "clientes.ver", "clientes.editar", "promociones", "personalizados", "pagos"],
  DOMICILIARIO: ["muestras.ver", "muestras.crear", "pagos"],
  CONTADOR: ["facturacion"], // la contadora: solo Facturación
  CLINIC: [],
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  STAFF: "Staff (microbiólogo)",
  COMERCIAL: "Comercial",
  DOMICILIARIO: "Domiciliario",
  CONTADOR: "Contador(a)",
  CLINIC: "Clínica",
}

// Dashboard financiero (/finanzas): solo los dueños (Michel y Guillermo), por correo — Marcelo también
// es ADMIN pero no lo ve. Lo revisan el middleware, el menú y la página.
export const FINANCE_EMAILS = ["michel@petspets.co", "guillermo@petspets.co"]
export function canSeeFinance(role: string | undefined | null, email: string | undefined | null): boolean {
  return role === "ADMIN" && !!email && FINANCE_EMAILS.includes(email.trim().toLowerCase())
}

export function can(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

// Permiso requerido para entrar a cada ruta del LIMS (el prefijo más específico primero)
export const ROUTE_PERMISSIONS: [string, Permission][] = [
  ["/muestras/nueva", "muestras.crear"],
  ["/muestras/eliminadas", "muestras.eliminar"],
  ["/muestras", "muestras.ver"],
  ["/pacientes", "muestras.ver"],
  ["/dashboard", "panel"],
  ["/clientes/nueva", "clientes.editar"],
  ["/clientes", "clientes.ver"],
  ["/caja", "caja"],
  ["/facturacion", "facturacion"],
  ["/inventario", "inventario"],
  ["/usuarios", "usuarios"],
  ["/promociones", "promociones"],
  ["/personalizados", "personalizados"],
  ["/rangos", "rangos"],
]

export function routePermission(pathname: string): Permission | null {
  const match = ROUTE_PERMISSIONS.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + "/"))
  return match ? match[1] : null
}

// Página de inicio de cada rol tras iniciar sesión
export function homeFor(role: string | undefined | null): string {
  if (role === "CLINIC") return "/portal-vet/dashboard"
  if (role === "CONTADOR") return "/facturacion"
  return can(role, "panel") ? "/dashboard" : "/muestras"
}
