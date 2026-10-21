import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"
import { can, canSeeFinance, homeFor, routePermission } from "@/lib/permissions"
import { PORTAL_SESSION_COOKIE } from "@/lib/sessionCookies"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Portal Vet (clínicas): SU PROPIA sesión (cookie aparte, lib/auth.ts: portalAuthOptions). Estar
  // conectado como personal no da acceso al portal ni al revés. /portal-vet es el ingreso/registro.
  if (pathname === "/portal-vet" || pathname.startsWith("/portal-vet/")) {
    const portal = await getToken({ req, cookieName: PORTAL_SESSION_COOKIE })
    const isClinic = portal?.role === "CLINIC"
    if (pathname === "/portal-vet") return isClinic ? NextResponse.redirect(new URL("/portal-vet/dashboard", req.url)) : NextResponse.next()
    return isClinic ? NextResponse.next() : NextResponse.redirect(new URL("/portal-vet", req.url))
  }

  // LIMS (personal): sesión del personal. Una sesión vieja de clínica en esta cookie no cuenta.
  const raw = await getToken({ req })
  const token = raw && raw.role !== "CLINIC" ? raw : null

  if (pathname === "/login") {
    if (token) return NextResponse.redirect(new URL(homeFor(token.role), req.url))
  }

  // Dashboard financiero: solo los dueños (lib/permissions.ts: FINANCE_EMAILS)
  if (pathname === "/finanzas" || pathname.startsWith("/finanzas/")) {
    if (!token) return NextResponse.redirect(new URL("/login", req.url))
    if (!canSeeFinance(token.role, token.email)) return NextResponse.redirect(new URL(homeFor(token.role), req.url))
    return NextResponse.next()
  }

  // Conexión con Siigo (credenciales de facturación): también solo los dueños
  if (pathname === "/facturacion/siigo" || pathname.startsWith("/facturacion/siigo/")) {
    if (!token) return NextResponse.redirect(new URL("/login", req.url))
    if (!canSeeFinance(token.role, token.email)) return NextResponse.redirect(new URL("/facturacion", req.url))
    return NextResponse.next()
  }

  // Staff routes — each one requires the permission mapped in lib/permissions.ts
  const permission = routePermission(pathname)
  if (permission) {
    if (!token) return NextResponse.redirect(new URL("/login", req.url))
    if (!can(token.role, permission)) return NextResponse.redirect(new URL(homeFor(token.role), req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/login",
    "/portal-vet",
    "/portal-vet/:path*",
    "/dashboard/:path*",
    "/muestras/:path*",
    "/pacientes/:path*",
    "/usuarios/:path*",
    "/clientes/:path*",
    "/inventario/:path*",
    "/caja/:path*",
    "/facturacion/:path*",
    "/promociones/:path*",
    "/personalizados/:path*",
    "/descuentos/:path*",
    "/rangos/:path*",
    "/finanzas/:path*",
  ],
}
