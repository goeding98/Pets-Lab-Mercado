import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { can } from "@/lib/permissions"

// Token para que el navegador suba el PDF directo a Vercel Blob (sin pasar por la función, que corta
// los cuerpos de más de 4.5 MB). Después el navegador registra el archivo con POST /api/upload/[examId].
export async function POST(req: Request, { params }: { params: { examId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !can(session.user.role, "resultados.editar"))
    return new NextResponse("No autorizado", { status: 401 })

  const exam = await prisma.orderExam.findUnique({ where: { id: params.examId }, select: { id: true } })
  if (!exam) return new NextResponse("No encontrado", { status: 404 })

  const body = (await req.json()) as HandleUploadBody
  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async pathname => {
        if (!pathname.startsWith(`uploads/${params.examId}/`)) throw new Error("Ruta no válida")
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: 50 * 1024 * 1024,
          addRandomSuffix: true,
        }
      },
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 })
  }
}
