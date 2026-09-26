import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"
import { can, homeFor, routePermission } from "@/lib/permissions"

export async function middleware(req: NextRequest) {
  const token = await getToken({ req })
  const { pathname } = req.nextUrl

  // Pages that redirect already-authenticated users away
  if (pathname === "/login" || pathname === "/resultados") {
    if (token) return NextResponse.redirect(new URL(homeFor(token.role), req.url))
  }

  // Clinic portal — CLINIC only
  if (pathname.startsWith("/resultados/dashboard")) {
    if (!token || token.role !== "CLINIC") {
      return NextResponse.redirect(new URL(token ? homeFor(token.role) : "/login", req.url))
    }
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
    "/resultados",
    "/dashboard/:path*",
    "/muestras/:path*",
    "/usuarios/:path*",
    "/clientes/:path*",
    "/inventario/:path*",
    "/caja/:path*",
    "/resultados/dashboard/:path*",
  ],
}
