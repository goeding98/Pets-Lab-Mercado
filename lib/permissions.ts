// Permisos por rol del personal del laboratorio. Se usa tanto en middleware (edge) como en
// páginas y server actions, así que este archivo no debe importar nada de servidor.

export type Permission =
  | "panel"             // /dashboard
  | "muestras.ver"      // listado y detalle de muestras, descargar PDFs
  | "muestras.crear"    // registrar una muestra nueva
  | "resultados.editar" // capturar resultados, subir/quitar PDF, cambiar estado de la orden
  | "clientes.ver"
  | "clientes.editar"   // crear/editar clínicas (y su usuario del portal)
  | "caja"
  | "inventario"
  | "usuarios"
  | "promociones"       // crear/eliminar promociones (exámenes combinados)

const ALL: Permission[] = [
  "panel", "muestras.ver", "muestras.crear", "resultados.editar",
  "clientes.ver", "clientes.editar", "caja", "inventario", "usuarios", "promociones",
]

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  ADMIN: ALL,
  STAFF: ALL.filter(p => p !== "usuarios" && p !== "promociones"),
  COMERCIAL: ["panel", "muestras.ver", "muestras.crear", "clientes.ver", "clientes.editar", "promociones"],
  DOMICILIARIO: ["muestras.ver", "muestras.crear"],
  CLINIC: [],
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  STAFF: "Staff (microbiólogo)",
  COMERCIAL: "Comercial",
  DOMICILIARIO: "Domiciliario",
  CLINIC: "Clínica",
}

export function can(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

// Permiso requerido para entrar a cada ruta del LIMS (el prefijo más específico primero)
export const ROUTE_PERMISSIONS: [string, Permission][] = [
  ["/muestras/nueva", "muestras.crear"],
  ["/muestras", "muestras.ver"],
  ["/dashboard", "panel"],
  ["/clientes/nueva", "clientes.editar"],
  ["/clientes", "clientes.ver"],
  ["/caja", "caja"],
  ["/inventario", "inventario"],
  ["/usuarios", "usuarios"],
  ["/promociones", "promociones"],
]

export function routePermission(pathname: string): Permission | null {
  const match = ROUTE_PERMISSIONS.find(([prefix]) => pathname === prefix || pathname.startsWith(prefix + "/"))
  return match ? match[1] : null
}

// Página de inicio de cada rol tras iniciar sesión
export function homeFor(role: string | undefined | null): string {
  if (role === "CLINIC") return "/portal-vet/dashboard"
  return can(role, "panel") ? "/dashboard" : "/muestras"
}
