import NextAuth from "next-auth"
import { portalAuthOptions } from "@/lib/auth"

// Sesión del Portal Vet (clínicas), separada de la del personal (/api/auth). Ver lib/auth.ts.
const handler = NextAuth(portalAuthOptions)
export { handler as GET, handler as POST }
