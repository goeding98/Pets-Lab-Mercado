import { NextAuthOptions } from "next-auth"
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

export const authOptions: NextAuthOptions = {
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
          where: { email: credentials.email },
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
    CredentialsProvider({
      id: "clinic",
      name: "Clínica",
      credentials: {
        clinicName: { label: "Nombre de la clínica", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.clinicName || !credentials?.password) return null

        const email = clinicEmail(credentials.clinicName)
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
  callbacks: {
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
  },
}
