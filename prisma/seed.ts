import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const TEMPLATES = [
  // ─── 1. Hemograma Completo ────────────────────────────────────────
  {
    name: "Hemograma Completo",
    area: "Hematología",
    turnaround: "Mismo día",
    sampleType: "1 mL EDTA",
    sections: [
      {
        name: "Serie Roja",
        order: 0,
        fields: [
          { name: "Eritrocitos", unit: "x10⁶/µL", refCanine: "5.5 – 8.5", refFeline: "5.0 – 10.0", technique: "Contador automático", fieldType: "number", order: 0 },
          { name: "Hemoglobina", unit: "g/dL", refCanine: "12.0 – 18.0", refFeline: "8.0 – 15.0", technique: "Cianometahemoglobina", fieldType: "number", order: 1 },
          { name: "Hematocrito", unit: "%", refCanine: "37 – 55", refFeline: "24 – 45", technique: "Microhematocrito", fieldType: "number", order: 2 },
          { name: "VCM", unit: "fL", refCanine: "60 – 77", refFeline: "39 – 55", technique: "Calculado", fieldType: "number", order: 3 },
          { name: "HCM", unit: "pg", refCanine: "19.5 – 24.5", refFeline: "13.0 – 17.0", technique: "Calculado", fieldType: "number", order: 4 },
          { name: "CHCM", unit: "g/dL", refCanine: "31.0 – 36.0", refFeline: "30.0 – 36.0", technique: "Calculado", fieldType: "number", order: 5 },
          { name: "RDW", unit: "%", refCanine: "12.0 – 15.5", refFeline: "14.0 – 18.0", technique: "Contador automático", fieldType: "number", order: 6 },
        ],
      },
      {
        name: "Leucograma",
        order: 1,
        fields: [
          { name: "Leucocitos totales", unit: "x10³/µL", refCanine: "6.0 – 17.0", refFeline: "5.5 – 19.5", technique: "Contador automático", fieldType: "number", order: 0 },
          { name: "Neutrófilos segmentados", unit: "%", refCanine: "60 – 77", refFeline: "35 – 75", technique: "Recuento diferencial", fieldType: "number", order: 1 },
          { name: "Neutrófilos en banda", unit: "%", refCanine: "0 – 3", refFeline: "0 – 3", technique: "Recuento diferencial", fieldType: "number", order: 2 },
          { name: "Linfocitos", unit: "%", refCanine: "12 – 30", refFeline: "20 – 55", technique: "Recuento diferencial", fieldType: "number", order: 3 },
          { name: "Monocitos", unit: "%", refCanine: "3 – 10", refFeline: "1 – 4", technique: "Recuento diferencial", fieldType: "number", order: 4 },
          { name: "Eosinófilos", unit: "%", refCanine: "2 – 10", refFeline: "2 – 12", technique: "Recuento diferencial", fieldType: "number", order: 5 },
          { name: "Basófilos", unit: "%", refCanine: "0 – 1", refFeline: "0 – 1", technique: "Recuento diferencial", fieldType: "number", order: 6 },
        ],
      },
      {
        name: "Plaquetas",
        order: 2,
        fields: [
          { name: "Plaquetas", unit: "x10³/µL", refCanine: "200 – 500", refFeline: "200 – 500", technique: "Contador automático", fieldType: "number", order: 0 },
          { name: "VPM", unit: "fL", refCanine: "6.1 – 10.1", refFeline: "12.0 – 17.5", technique: "Contador automático", fieldType: "number", order: 1 },
        ],
      },
      {
        name: "Morfología",
        order: 3,
        fields: [
          { name: "Observaciones morfológicas", unit: "", refCanine: "", refFeline: "", technique: "Microscopía óptica", fieldType: "text", order: 0 },
        ],
      },
    ],
  },

  // ─── 2. Control Hospitalario ─────────────────────────────────────
  {
    name: "Control Hospitalario",
    area: "Hematología",
    turnaround: "Mismo día",
    sampleType: "1 mL EDTA",
    sections: [
      {
        name: "Resultados",
        order: 0,
        fields: [
          { name: "Hematocrito", unit: "%", refCanine: "37 – 55", refFeline: "24 – 45", technique: "Microhematocrito", fieldType: "number", order: 0 },
          { name: "Proteínas plasmáticas", unit: "g/dL", refCanine: "6.0 – 8.0", refFeline: "6.0 – 8.0", technique: "Refractometría", fieldType: "number", order: 1 },
          { name: "Leucocitos estimados", unit: "x10³/µL", refCanine: "6.0 – 17.0", refFeline: "5.5 – 19.5", technique: "Estimación en frotis", fieldType: "number", order: 2 },
          { name: "Observaciones", unit: "", refCanine: "", refFeline: "", technique: "Microscopía", fieldType: "text", order: 3 },
        ],
      },
    ],
  },

  // ─── 3. Reticulocitos ─────────────────────────────────────────────
  {
    name: "Reticulocitos",
    area: "Hematología",
    turnaround: "Mismo día",
    sampleType: "1 mL EDTA",
    sections: [
      {
        name: "Resultados",
        order: 0,
        fields: [
          { name: "Reticulocitos", unit: "%", refCanine: "0 – 1.5", refFeline: "0 – 0.4", technique: "Azul brillante de cresilo", fieldType: "number", order: 0 },
          { name: "Reticulocitos absolutos", unit: "x10³/µL", refCanine: "< 80", refFeline: "< 50", technique: "Calculado", fieldType: "number", order: 1 },
          { name: "Interpretación", unit: "", refCanine: "", refFeline: "", technique: "", fieldType: "text", order: 2 },
        ],
      },
    ],
  },

  // ─── 4. Test Rápido FIV/FeLV ──────────────────────────────────────
  {
    name: "Test Rápido FIV/FeLV",
    area: "Hematología",
    turnaround: "Mismo día",
    sampleType: "0.5 mL suero",
    sections: [
      {
        name: "Resultados",
        order: 0,
        fields: [
          { name: "FIV (Anticuerpos)", unit: "", refCanine: "—", refFeline: "Negativo", technique: "Inmunocromatografía", fieldType: "select", order: 0 },
          { name: "FeLV (Antígeno)", unit: "", refCanine: "—", refFeline: "Negativo", technique: "Inmunocromatografía", fieldType: "select", order: 1 },
          { name: "Observaciones", unit: "", refCanine: "", refFeline: "", technique: "", fieldType: "text", order: 2 },
        ],
      },
    ],
  },

  // ─── 5. Perfil Renal ──────────────────────────────────────────────
  {
    name: "Perfil Renal",
    area: "Bioquímica",
    turnaround: "24h",
    sampleType: "2 mL suero (tubo seco)",
    sections: [
      {
        name: "Resultados",
        order: 0,
        fields: [
          { name: "BUN (Nitrógeno ureico)", unit: "mg/dL", refCanine: "7 – 27", refFeline: "14 – 36", technique: "Ureasa UV", fieldType: "number", order: 0 },
          { name: "Creatinina", unit: "mg/dL", refCanine: "0.5 – 1.5", refFeline: "0.8 – 2.4", technique: "Jaffé cinético", fieldType: "number", order: 1 },
          { name: "Fósforo", unit: "mg/dL", refCanine: "2.5 – 6.8", refFeline: "3.1 – 7.5", technique: "Fosfomolibdato UV", fieldType: "number", order: 2 },
          { name: "Potasio", unit: "mEq/L", refCanine: "3.5 – 5.8", refFeline: "3.4 – 5.6", technique: "ISE", fieldType: "number", order: 3 },
          { name: "SDMA", unit: "µg/dL", refCanine: "< 14", refFeline: "< 14", technique: "ELISA", fieldType: "number", order: 4 },
        ],
      },
    ],
  },

  // ─── 6. Perfil Hepático ───────────────────────────────────────────
  {
    name: "Perfil Hepático",
    area: "Bioquímica",
    turnaround: "24h",
    sampleType: "2 mL suero (tubo seco)",
    sections: [
      {
        name: "Resultados",
        order: 0,
        fields: [
          { name: "ALT (GPT)", unit: "U/L", refCanine: "10 – 88", refFeline: "10 – 100", technique: "UV optimizado IFCC", fieldType: "number", order: 0 },
          { name: "AST (GOT)", unit: "U/L", refCanine: "0 – 50", refFeline: "0 – 50", technique: "UV optimizado IFCC", fieldType: "number", order: 1 },
          { name: "FA (Fosfatasa alcalina)", unit: "U/L", refCanine: "20 – 150", refFeline: "10 – 72", technique: "pNPP", fieldType: "number", order: 2 },
          { name: "GGT", unit: "U/L", refCanine: "1 – 12", refFeline: "1 – 10", technique: "IFCC", fieldType: "number", order: 3 },
          { name: "Bilirrubina total", unit: "mg/dL", refCanine: "0.1 – 0.6", refFeline: "0.1 – 0.6", technique: "Diazo", fieldType: "number", order: 4 },
          { name: "Bilirrubina directa", unit: "mg/dL", refCanine: "0.0 – 0.2", refFeline: "0.0 – 0.2", technique: "Diazo", fieldType: "number", order: 5 },
          { name: "Bilirrubina indirecta", unit: "mg/dL", refCanine: "0.0 – 0.4", refFeline: "0.0 – 0.4", technique: "Calculado", fieldType: "calculated", calcFormula: "bilirrubina_total - bilirrubina_directa", order: 6 },
        ],
      },
    ],
  },

  // ─── 7. Perfil Prequirúrgico ──────────────────────────────────────
  {
    name: "Perfil Prequirúrgico",
    area: "Bioquímica",
    turnaround: "24h",
    sampleType: "2 mL suero (tubo seco)",
    sections: [
      {
        name: "Resultados",
        order: 0,
        fields: [
          { name: "BUN", unit: "mg/dL", refCanine: "7 – 27", refFeline: "14 – 36", technique: "Ureasa UV", fieldType: "number", order: 0 },
          { name: "Creatinina", unit: "mg/dL", refCanine: "0.5 – 1.5", refFeline: "0.8 – 2.4", technique: "Jaffé cinético", fieldType: "number", order: 1 },
          { name: "ALT (GPT)", unit: "U/L", refCanine: "10 – 88", refFeline: "10 – 100", technique: "UV optimizado IFCC", fieldType: "number", order: 2 },
          { name: "FA", unit: "U/L", refCanine: "20 – 150", refFeline: "10 – 72", technique: "pNPP", fieldType: "number", order: 3 },
          { name: "Proteínas totales", unit: "g/dL", refCanine: "5.4 – 7.5", refFeline: "5.7 – 8.9", technique: "Biuret", fieldType: "number", order: 4 },
          { name: "Glucosa", unit: "mg/dL", refCanine: "65 – 118", refFeline: "70 – 150", technique: "GOD-PAP", fieldType: "number", order: 5 },
          { name: "Hematocrito", unit: "%", refCanine: "37 – 55", refFeline: "24 – 45", technique: "Microhematocrito", fieldType: "number", order: 6 },
        ],
      },
    ],
  },

  // ─── 8. Proteínas + Albumina + Globulinas ─────────────────────────
  {
    name: "Proteínas Totales, Albumina y Globulinas",
    area: "Bioquímica",
    turnaround: "24h",
    sampleType: "2 mL suero (tubo seco)",
    sections: [
      {
        name: "Resultados",
        order: 0,
        fields: [
          { name: "Proteínas totales", unit: "g/dL", refCanine: "5.4 – 7.5", refFeline: "5.7 – 8.9", technique: "Biuret", fieldType: "number", order: 0 },
          { name: "Albumina", unit: "g/dL", refCanine: "2.6 – 4.0", refFeline: "2.1 – 3.3", technique: "Bromocresol verde", fieldType: "number", order: 1 },
          { name: "Globulinas", unit: "g/dL", refCanine: "2.3 – 4.5", refFeline: "2.6 – 5.1", technique: "Calculado", fieldType: "calculated", calcFormula: "proteinas_totales - albumina", order: 2 },
          { name: "Relación A/G", unit: "", refCanine: "0.7 – 1.5", refFeline: "0.5 – 1.0", technique: "Calculado", fieldType: "calculated", calcFormula: "albumina / globulinas", order: 3 },
        ],
      },
    ],
  },

  // ─── 9. Panel Electrolítico ───────────────────────────────────────
  {
    name: "Panel Electrolítico",
    area: "Bioquímica",
    turnaround: "24h",
    sampleType: "2 mL suero (tubo seco)",
    sections: [
      {
        name: "Resultados",
        order: 0,
        fields: [
          { name: "Sodio", unit: "mEq/L", refCanine: "141 – 152", refFeline: "147 – 156", technique: "ISE indirecto", fieldType: "number", order: 0 },
          { name: "Potasio", unit: "mEq/L", refCanine: "3.5 – 5.8", refFeline: "3.4 – 5.6", technique: "ISE indirecto", fieldType: "number", order: 1 },
          { name: "Cloro", unit: "mEq/L", refCanine: "105 – 122", refFeline: "107 – 120", technique: "ISE indirecto", fieldType: "number", order: 2 },
          { name: "Calcio", unit: "mg/dL", refCanine: "9.3 – 11.5", refFeline: "8.2 – 10.8", technique: "Arsenazo III", fieldType: "number", order: 3 },
          { name: "Fósforo", unit: "mg/dL", refCanine: "2.5 – 6.8", refFeline: "3.1 – 7.5", technique: "Fosfomolibdato UV", fieldType: "number", order: 4 },
        ],
      },
    ],
  },

  // ─── 10. Glucosa ──────────────────────────────────────────────────
  {
    name: "Glucosa",
    area: "Bioquímica",
    turnaround: "24h",
    sampleType: "1 mL suero (tubo seco)",
    sections: [
      {
        name: "Resultados",
        order: 0,
        fields: [
          { name: "Glucosa", unit: "mg/dL", refCanine: "65 – 118", refFeline: "70 – 150", technique: "GOD-PAP", fieldType: "number", order: 0 },
          { name: "Observaciones", unit: "", refCanine: "", refFeline: "", technique: "", fieldType: "text", order: 1 },
        ],
      },
    ],
  },

  // ─── 11. Citología Diagnóstica ────────────────────────────────────
  {
    name: "Citología Diagnóstica",
    area: "Citología",
    turnaround: "48h",
    sampleType: "Placa fijada con alcohol / tinción Diff-Quick",
    sections: [
      {
        name: "Datos de la muestra",
        order: 0,
        fields: [
          { name: "Sitio de toma", unit: "", refCanine: "", refFeline: "", technique: "", fieldType: "text", order: 0 },
          { name: "Tipo de muestra", unit: "", refCanine: "", refFeline: "", technique: "", fieldType: "text", order: 1 },
          { name: "Calidad de la muestra", unit: "", refCanine: "", refFeline: "", technique: "Microscopía óptica", fieldType: "select", order: 2 },
        ],
      },
      {
        name: "Hallazgos",
        order: 1,
        fields: [
          { name: "Tipo celular predominante", unit: "", refCanine: "", refFeline: "", technique: "Microscopía óptica", fieldType: "text", order: 0 },
          { name: "Descripción microscópica", unit: "", refCanine: "", refFeline: "", technique: "Microscopía óptica", fieldType: "text", order: 1 },
          { name: "Microorganismos observados", unit: "", refCanine: "", refFeline: "", technique: "Microscopía óptica", fieldType: "text", order: 2 },
          { name: "Diagnóstico citológico", unit: "", refCanine: "", refFeline: "", technique: "Microscopía óptica", fieldType: "text", order: 3 },
          { name: "Recomendaciones", unit: "", refCanine: "", refFeline: "", technique: "", fieldType: "text", order: 4 },
        ],
      },
    ],
  },

  // ─── 12. Citología de Oído ────────────────────────────────────────
  {
    name: "Citología de Oído",
    area: "Citología",
    turnaround: "48h",
    sampleType: "Hisopo con material de oído",
    sections: [
      {
        name: "Resultados",
        order: 0,
        fields: [
          { name: "Oído derecho / izquierdo", unit: "", refCanine: "", refFeline: "", technique: "", fieldType: "select", order: 0 },
          { name: "Células epiteliales", unit: "", refCanine: "", refFeline: "", technique: "Microscopía óptica", fieldType: "text", order: 1 },
          { name: "Neutrófilos", unit: "", refCanine: "", refFeline: "", technique: "Microscopía óptica", fieldType: "text", order: 2 },
          { name: "Cocos", unit: "", refCanine: "", refFeline: "", technique: "Microscopía óptica", fieldType: "text", order: 3 },
          { name: "Bacilos", unit: "", refCanine: "", refFeline: "", technique: "Microscopía óptica", fieldType: "text", order: 4 },
          { name: "Malassezia", unit: "", refCanine: "", refFeline: "", technique: "Microscopía óptica", fieldType: "text", order: 5 },
          { name: "Diagnóstico", unit: "", refCanine: "", refFeline: "", technique: "Microscopía óptica", fieldType: "text", order: 6 },
        ],
      },
    ],
  },

  // ─── 13. Citología Vaginal ────────────────────────────────────────
  {
    name: "Citología Vaginal",
    area: "Citología",
    turnaround: "48h",
    sampleType: "Hisopo vaginal en solución salina",
    sections: [
      {
        name: "Resultados",
        order: 0,
        fields: [
          { name: "Células parabasales", unit: "%", refCanine: "", refFeline: "", technique: "Microscopía óptica", fieldType: "number", order: 0 },
          { name: "Células intermedias", unit: "%", refCanine: "", refFeline: "", technique: "Microscopía óptica", fieldType: "number", order: 1 },
          { name: "Células superficiales nucleadas", unit: "%", refCanine: "", refFeline: "", technique: "Microscopía óptica", fieldType: "number", order: 2 },
          { name: "Células superficiales anucleadas", unit: "%", refCanine: "", refFeline: "", technique: "Microscopía óptica", fieldType: "number", order: 3 },
          { name: "Eritrocitos", unit: "", refCanine: "", refFeline: "", technique: "Microscopía óptica", fieldType: "text", order: 4 },
          { name: "Bacterias", unit: "", refCanine: "", refFeline: "", technique: "Microscopía óptica", fieldType: "text", order: 5 },
          { name: "Fase del ciclo estral", unit: "", refCanine: "", refFeline: "", technique: "Interpretación citológica", fieldType: "text", order: 6 },
        ],
      },
    ],
  },

  // ─── 14. Uroanálisis Completo ─────────────────────────────────────
  {
    name: "Uroanálisis Completo",
    area: "Uroanálisis",
    turnaround: "Mismo día",
    sampleType: "5 mL orina fresca (máx 2h)",
    sections: [
      {
        name: "Propiedades físicas",
        order: 0,
        fields: [
          { name: "Color", unit: "", refCanine: "Amarillo", refFeline: "Amarillo", technique: "Observación directa", fieldType: "text", order: 0 },
          { name: "Aspecto", unit: "", refCanine: "Claro", refFeline: "Claro", technique: "Observación directa", fieldType: "select", order: 1 },
          { name: "Densidad", unit: "", refCanine: "1.015 – 1.045", refFeline: "1.020 – 1.060", technique: "Refractometría", fieldType: "number", order: 2 },
        ],
      },
      {
        name: "Propiedades químicas (tira reactiva)",
        order: 1,
        fields: [
          { name: "pH", unit: "", refCanine: "5.5 – 7.5", refFeline: "5.5 – 7.5", technique: "Tira reactiva", fieldType: "number", order: 0 },
          { name: "Proteínas", unit: "", refCanine: "Negativo", refFeline: "Negativo", technique: "Tira reactiva", fieldType: "select", order: 1 },
          { name: "Glucosa", unit: "", refCanine: "Negativo", refFeline: "Negativo", technique: "Tira reactiva", fieldType: "select", order: 2 },
          { name: "Cetonas", unit: "", refCanine: "Negativo", refFeline: "Negativo", technique: "Tira reactiva", fieldType: "select", order: 3 },
          { name: "Bilirrubina", unit: "", refCanine: "Negativo / trazas", refFeline: "Negativo", technique: "Tira reactiva", fieldType: "select", order: 4 },
          { name: "Sangre oculta", unit: "", refCanine: "Negativo", refFeline: "Negativo", technique: "Tira reactiva", fieldType: "select", order: 5 },
          { name: "Urobilinógeno", unit: "", refCanine: "0.1 – 1.0 EU/dL", refFeline: "0.1 – 1.0 EU/dL", technique: "Tira reactiva", fieldType: "text", order: 6 },
        ],
      },
      {
        name: "Sedimento urinario",
        order: 2,
        fields: [
          { name: "Leucocitos", unit: "/campo", refCanine: "0 – 5", refFeline: "0 – 5", technique: "Microscopía óptica x40", fieldType: "number", order: 0 },
          { name: "Eritrocitos", unit: "/campo", refCanine: "0 – 5", refFeline: "0 – 5", technique: "Microscopía óptica x40", fieldType: "number", order: 1 },
          { name: "Células epiteliales", unit: "/campo", refCanine: "Escasas", refFeline: "Escasas", technique: "Microscopía óptica x40", fieldType: "text", order: 2 },
          { name: "Cilindros", unit: "", refCanine: "Ninguno", refFeline: "Ninguno", technique: "Microscopía óptica x10", fieldType: "text", order: 3 },
          { name: "Bacterias", unit: "", refCanine: "Ninguna", refFeline: "Ninguna", technique: "Microscopía óptica x40", fieldType: "text", order: 4 },
          { name: "Cristales", unit: "", refCanine: "Escasos", refFeline: "Escasos", technique: "Microscopía óptica x40", fieldType: "text", order: 5 },
        ],
      },
    ],
  },

  // ─── 15. Relación UPC ─────────────────────────────────────────────
  {
    name: "Relación Proteína/Creatinina Urinaria (UPC)",
    area: "Uroanálisis",
    turnaround: "Mismo día",
    sampleType: "5 mL orina fresca",
    sections: [
      {
        name: "Resultados",
        order: 0,
        fields: [
          { name: "Proteínas urinarias", unit: "mg/dL", refCanine: "", refFeline: "", technique: "Biuret / tira reactiva cuantitativa", fieldType: "number", order: 0 },
          { name: "Creatinina urinaria", unit: "mg/dL", refCanine: "", refFeline: "", technique: "Jaffé cinético", fieldType: "number", order: 1 },
          { name: "Relación UPC", unit: "", refCanine: "< 0.2 (normal), 0.2–0.5 (borderline), > 0.5 (proteinuria)", refFeline: "< 0.2 (normal), 0.2–0.4 (borderline), > 0.4 (proteinuria)", technique: "Calculado", fieldType: "calculated", calcFormula: "proteinas_urinarias / creatinina_urinaria", order: 2 },
          { name: "Interpretación", unit: "", refCanine: "", refFeline: "", technique: "", fieldType: "text", order: 3 },
        ],
      },
    ],
  },
]

async function main() {
  console.log("Seeding database...")

  // Admin user
  const adminPassword = await bcrypt.hash("admin1234", 10)
  await prisma.user.upsert({
    where: { email: "admin@petslab.co" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@petslab.co",
      password: adminPassword,
      role: "ADMIN",
    },
  })

  // Default staff user
  const staffPassword = await bcrypt.hash("staff1234", 10)
  await prisma.user.upsert({
    where: { email: "anderson@petslab.co" },
    update: {},
    create: {
      name: "Anderson Valencia",
      email: "anderson@petslab.co",
      password: staffPassword,
      role: "STAFF",
    },
  })

  // Seed exam templates
  for (const t of TEMPLATES) {
    const template = await prisma.examTemplate.upsert({
      where: { id: t.name.toLowerCase().replace(/\s+/g, "-") },
      update: {},
      create: {
        id: t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: t.name,
        area: t.area,
        turnaround: t.turnaround,
        sampleType: t.sampleType,
      },
    })

    for (const s of t.sections) {
      const section = await prisma.examSection.create({
        data: {
          templateId: template.id,
          name: s.name,
          order: s.order,
        },
      })

      for (const f of s.fields) {
        await prisma.examField.create({
          data: {
            sectionId: section.id,
            name: f.name,
            unit: f.unit || null,
            refCanine: f.refCanine || null,
            refFeline: f.refFeline || null,
            technique: f.technique || null,
            fieldType: f.fieldType,
            calcFormula: (f as { calcFormula?: string }).calcFormula || null,
            order: f.order,
          },
        })
      }
    }
    console.log(`  ✓ ${t.name}`)
  }

  console.log("Done.")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
