"use server"
import { headers } from "next/headers"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { can } from "@/lib/permissions"
import { makeShareToken } from "@/lib/shareLink"

// Enlace firmado de WhatsApp para unas partes de un perfil (lib/reportParts.ts): /r/<token kind "p">
export async function partsShareUrl(examId: string, partIdx: number[]): Promise<string> {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "muestras.ver")) throw new Error("No autorizado")
  const idx = Array.from(new Set(partIdx.filter(i => Number.isInteger(i) && i >= 0))).sort((a, b) => a - b)
  if (idx.length === 0) throw new Error("Elige al menos una parte")
  const host = headers().get("host") ?? "www.petslab.com.co"
  return `${host.startsWith("localhost") ? "http" : "https"}://${host}/r/${makeShareToken({ kind: "p", id: `${examId}~${idx.join("-")}` })}`
}
