import type { PrismaClient } from "@prisma/client"

// Producto "Coprológico Seriado": 3 coprológicos (uno por muestra, cada uno de un día diferente) en un solo
// examen de Coproparasitología, $30.000. Cada bloque es una sección marcador "Muestra N — Coprológico"
// (sin campos; resultado estructurado, ver lib/coprologico.ts: readCoproAt). Copia tiempo de entrega,
// muestra y receta (x3) del Coprológico. Idempotente: si ya existe, no hace nada.
export const COPRO_SERIADO_NAME = "Coprológico Seriado"

export async function createCoproSeriado(prisma: PrismaClient): Promise<string> {
  if (await prisma.examTemplate.findFirst({ where: { name: COPRO_SERIADO_NAME } })) return "ya existe"
  const base = await prisma.examTemplate.findFirst({
    where: { name: { startsWith: "Coprológico (" }, active: true, isPromotion: false },
    include: { recipeItems: true },
  })
  if (!base) throw new Error("No se encontró el Coprológico base")

  const t = await prisma.examTemplate.create({
    data: {
      name: COPRO_SERIADO_NAME,
      area: base.area,
      turnaround: base.turnaround,
      sampleType: "Materia fecal - 3 muestras de días diferentes",
      price: 30000,
      description: "3 coprológicos (microscopía y Miniflotac), cada muestra de un día diferente, con su fecha",
      sections: { create: [1, 2, 3].map((n, i) => ({ name: `Muestra ${n} — Coprológico`, order: i })) },
      recipeItems: { create: base.recipeItems.map(r => ({ itemId: r.itemId, quantity: r.quantity * 3 })) },
    },
  })
  return `creado ${t.id}`
}
