import { getToken } from "next-auth/jwt"
import { NextRequest, NextResponse } from "next/server"

export async function middleware(req: NextRequest) {
  const token = await getToken({ req })
  const { pathname } = req.nextUrl

  if (pathname.startsWith("/resultados/dashboard")) {
    if (!token || token.role !== "CLINIC") {
      return NextResponse.redirect(new URL("/resultados", req.url))
    }
    return NextResponse.next()
  }

  const staffRoutes = ["/dashboard", "/muestras", "/usuarios", "/clientes"]
  if (staffRoutes.some(r => pathname.startsWith(r))) {
    if (!token) return NextResponse.redirect(new URL("/login", req.url))
    if (token.role === "CLINIC") return NextResponse.redirect(new URL("/resultados/dashboard", req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/muestras/:path*",
    "/usuarios/:path*",
    "/clientes/:path*",
    "/resultados/dashboard/:path*",
  ],
}
