import { prisma } from "./db"
import { readOrinaConfig, type OrinaConfig } from "./orina"

// Configuración del laboratorio guardada en LabSetting (solo servidor)
export async function getOrinaConfig(): Promise<OrinaConfig> {
  const row = await prisma.labSetting.findUnique({ where: { key: "orina" } })
  return readOrinaConfig(row?.value ?? null)
}
