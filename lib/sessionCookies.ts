// Nombres de las cookies de sesión (sin dependencias: lo usan lib/auth.ts y el middleware, que corre en edge).
// El personal usa la cookie por defecto de NextAuth; el Portal Vet, la suya propia.
export const secureCookies = (process.env.NEXTAUTH_URL ?? "").startsWith("https://") || !!process.env.VERCEL
export const PORTAL_SESSION_COOKIE = `${secureCookies ? "__Secure-" : ""}petslab-portal.session-token`
