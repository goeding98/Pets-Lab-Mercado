// Sección "PCR" (lista de precios PCR 2026): los procesa un laboratorio externo, así que cada examen tiene
// solo una caja de texto "Resultado" (sección "Resultado PCR", de texto libre en lib/sections.ts) y se le sube
// el PDF del laboratorio. Retira (active = false) los PCR viejos del área "PCR Veterinaria".
// Idempotente. Sin --apply es un ensayo que revierte.
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")
const AREA = "PCR"
const OLD_AREA = "PCR Veterinaria"

const LIST: [string, number][] = [
  // Panel felino
  ["PCR Felino - Diarrea crónica", 259000],
  ["PCR Felino - Hemotrópicos felino básico", 259000],
  ["PCR Felino - Infectocontagiosas 1", 256300],
  ["PCR Felino - Infectocontagiosas 2", 271600],
  ["PCR Felino - Infectocontagiosas 3", 296800],
  ["PCR Felino - Infectocontagiosas 4", 426400],
  ["PCR Felino - Infectocontagiosas 5", 340000],
  ["PCR Felino - Respiratorio felino", 385000],
  ["PCR Felino - Neurológico felino", 385000],
  ["PCR Felino - Ocular felino", 369700],
  // Panel canino
  ["PCR Canino - Cardiaco", 212000],
  ["PCR Canino - Diarreico 1", 239000],
  ["PCR Canino - Diarreico 2", 257000],
  ["PCR Canino - Ictérico", 322000],
  ["PCR Canino - Hemotrópicos canino básico", 259000],
  ["PCR Canino - Neurológico 1", 523600],
  ["PCR Canino - Neurológico 2", 318400],
  ["PCR Canino - Neurológico 3", 318400],
  // Pruebas individuales
  ...([
    "Hepatozoon spp.", "Anaplasma spp.", "Mycoplasma spp.", "Babesia spp.", "Dirofilaria spp.", "Rickettsia spp.",
    "Bartonella spp.", "Ehrlichia spp.", "Toxoplasma spp.", "Trichomona spp.", "Pentatrichomona spp.", "Giardia spp.",
    "Leptospira spp.", "Salmonella spp.", "Neospora spp.", "Cryptococcus spp.", "Herpesvirus felino (FHV-1)",
    "Panleucopenia", "Chlamydia felis",
  ].map(n => [`PCR ${n}`, 154400] as [string, number])),
  ...([
    "Calicivirus felino", "Peritonitis infecciosa felina (PIF)", "Leucemia felina", "Sida felino", "Distemper", "Parvovirus",
  ].map(n => [`PCR ${n}`, 179600] as [string, number])),
]

async function main() {
  await prisma.$transaction(async tx => {
    let created = 0, updated = 0
    for (const [name, price] of LIST) {
      const found = await tx.examTemplate.findFirst({ where: { name, area: AREA } })
      if (found) {
        await tx.examTemplate.update({ where: { id: found.id }, data: { price, active: true } })
        updated++
        continue
      }
      await tx.examTemplate.create({
        data: {
          name, area: AREA, price,
          turnaround: "Según laboratorio de referencia",
          sampleType: "Según la prueba",
          sections: { create: [{ name: "Resultado PCR", order: 0, fields: { create: [{ name: "Resultado", key: "resultado_pcr", fieldType: "text", order: 0 }] } }] },
        },
      })
      created++
    }
    const retired = await tx.examTemplate.updateMany({ where: { area: OLD_AREA, active: true }, data: { active: false } })
    console.log(`PCR: ${created} creados, ${updated} actualizados, ${retired.count} viejos retirados (${LIST.length} en la lista)`)
    if (!APPLY) throw new Error("ENSAYO (sin --apply): se revierte")
  }, { timeout: 120000 })
}

main().catch(e => console.log(e.message)).finally(() => prisma.$disconnect())
