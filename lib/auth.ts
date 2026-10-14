import { getServerSession, type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./db"

export function slugifyClinicName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
}

export function clinicEmail(name: string): string {
  return `${slugifyClinicName(name)}@portal.petslab`
}

// Dos portales con sesiones SEPARADAS (cookies distintas): el LIMS del personal (/api/auth, cookie por defecto)
// y el Portal Vet de las clínicas (/api/portal-auth, cookie propia). Iniciar sesión en uno no afecta al otro.
import { PORTAL_SESSION_COOKIE, secureCookies } from "./sessionCookies"
const cookieOptions = { httpOnly: true, sameSite: "lax" as const, path: "/", secure: secureCookies }

const callbacks: NextAuthOptions["callbacks"] = {
  async jwt({ token, user }) {
    if (user) {
      token.id = user.id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      token.role = (user as any).role
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      token.clinicId = (user as any).clinicId
    }
    return token
  },
  async session({ session, token }) {
    if (session.user) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      session.user.clinicId = token.clinicId as string | undefined
    }
    return session
  },
}

// LIMS (personal del laboratorio)
export const authOptions: NextAuthOptions = {
  callbacks,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "staff",
      name: "Staff",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email.trim().toLowerCase() },
          include: { clinic: true },
        })
        if (!user || user.role === "CLINIC") return null

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          clinicId: user.clinicId ?? undefined,
        }
      },
    }),
  ],
}

// Portal Vet (clínicas)
export const portalAuthOptions: NextAuthOptions = {
  callbacks,
  session: { strategy: "jwt" },
  pages: { signIn: "/portal-vet", error: "/portal-vet" },
  cookies: {
    sessionToken: { name: PORTAL_SESSION_COOKIE, options: cookieOptions },
    csrfToken: { name: `${secureCookies ? "__Secure-" : ""}petslab-portal.csrf-token`, options: cookieOptions },
    callbackUrl: { name: `${secureCookies ? "__Secure-" : ""}petslab-portal.callback-url`, options: cookieOptions },
  },
  providers: [
    CredentialsProvider({
      id: "clinic",
      name: "Clínica",
      credentials: {
        login: { label: "Correo o nombre de la clínica", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.password) return null

        // Las clínicas registradas desde el Portal Vet entran con su correo; las creadas por el
        // staff en /clientes, con el nombre de la clínica (se traduce a su email interno).
        const login = credentials.login.trim()
        const email = login.includes("@") ? login.toLowerCase() : clinicEmail(login)
        const user = await prisma.user.findUnique({
          where: { email },
        })
        if (!user || user.role !== "CLINIC") return null

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          clinicId: user.clinicId ?? undefined,
        }
      },
    }),
  ],
}

export const getStaffSession = () => getServerSession(authOptions)
export const getPortalSession = () => getServerSession(portalAuthOptions)
// Rutas que usan los dos portales (PDF, fotos, sedes): la del personal y, si no, la de la clínica
export async function getAnySession() {
  return (await getStaffSession()) ?? (await getPortalSession())
}
