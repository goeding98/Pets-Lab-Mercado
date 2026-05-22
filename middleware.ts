export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/muestras/:path*",
    "/usuarios/:path*",
    "/mis-muestras/:path*",
  ],
}
