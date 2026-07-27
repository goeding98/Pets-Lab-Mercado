import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

export async function middleware(req: NextRequest) {
  const token = await getToken({ req })
  const { pathname } = req.nextUrl

  // Pages that redirect already-authenticated users away
  if (pathname === "/login" || pathname === "/resultados") {
    if (token?.role === "CLINIC") return NextResponse.redirect(new URL("/resultados/dashboard", req.url))
    if (token && token.role !== "CLINIC") return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Clinic portal — CLINIC only
  if (pathname.startsWith("/resultados/dashboard")) {
    if (!token || token.role !== "CLINIC") {
      return NextResponse.redirect(new URL(token ? "/dashboard" : "/login", req.url))
    }
    return NextResponse.next()
  }

  // Staff routes — non-CLINIC only
  const staffRoutes = ["/dashboard", "/muestras", "/usuarios", "/clientes"]
  if (staffRoutes.some(r => pathname.startsWith(r))) {
    if (!token) return NextResponse.redirect(new URL("/login", req.url))
    if (token.role === "CLINIC") return NextResponse.redirect(new URL("/resultados/dashboard", req.url))
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
    "/resultados/dashboard/:path*",
  ],
}
