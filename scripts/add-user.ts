import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash("petspets123", 10)
  const user = await prisma.user.upsert({
    where: { email: "guillermo@petspets.co" },
    update: { password: hash, role: "ADMIN" },
    create: {
      name: "Guillermo",
      email: "guillermo@petspets.co",
      password: hash,
      role: "ADMIN",
    },
  })
  console.log("Usuario creado:", user.email, "| Rol:", user.role)
}

main().catch(console.error).finally(() => prisma.$disconnect())
