import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()

type Field = {
  name: string
  unit?: string
  refCanine?: string
  refFeline?: string
  technique?: string
  fieldType?: string
  calcFormula?: string
}
type Section = { name: string; fields: Field[] }

async function upsertTemplate(
  name: string,
  area: string,
  turnaround: string,
  sampleType: string,
  sections: Section[]
) {
  const existing = await prisma.examTemplate.findFirst({ where: { name } })
  if (existing) {
    await prisma.examTemplate.update({ where: { id: existing.id }, data: { area, turnaround, sampleType } })
    console.log(`  ↺ ${name} → ${area}`)
    return
  }

  const template = await prisma.examTemplate.create({ data: { name, area, turnaround, sampleType } })

  for (let si = 0; si < sections.length; si++) {
    const s = sections[si]
    const section = await prisma.examSection.create({
      data: { templateId: template.id, name: s.name, order: si },
    })
    for (let fi = 0; fi < s.fields.length; fi++) {
      const f = s.fields[fi]
      await prisma.examField.create({
        data: {
          sectionId: section.id,
          name: f.name,
          unit: f.unit || null,
          refCanine: f.refCanine || null,
          refFeline: f.refFeline || null,
          technique: f.technique || null,
          fieldType: f.fieldType || "number",
          calcFormula: f.calcFormula || null,
          order: fi,
        },
      })
    }
  }
  console.log(`  ✓ ${name}`)
}

async function main() {
  console.log("Migrando exámenes...\n")

  // ── HEMATOLOGÍA ───────────────────────────────────────────────────────
  console.log("Hematología:")
  await upsertTemplate("Hematocrito", "Hematología", "Mismo día", "1 mL EDTA", [
    { name: "Resultados", fields: [
      { name: "Hematocrito", unit: "%", refCanine: "37 – 55", refFeline: "24 – 45", technique: "Microhematocrito" },
    ]},
  ])
  await upsertTemplate("Hemograma Completo", "Hematología", "Mismo día", "1 mL EDTA", [])
  await upsertTemplate("Hemograma Sencillo", "Hematología", "Mismo día", "1 mL EDTA", [
    { name: "Resultados", fields: [
      { name: "Hematocrito", unit: "%", refCanine: "37 – 55", refFeline: "24 – 45", technique: "Microhematocrito" },
      { name: "Proteínas plasmáticas", unit: "g/dL", refCanine: "6.0 – 8.0", refFeline: "6.0 – 8.0", technique: "Refractometría" },
      { name: "Leucocitos estimados", unit: "x10³/µL", refCanine: "6.0 – 17.0", refFeline: "5.5 – 19.5", technique: "Estimación en frotis" },
      { name: "Observaciones morfológicas", fieldType: "text", technique: "Microscopía óptica" },
    ]},
  ])
  await upsertTemplate("Recuento de Plaquetas", "Hematología", "Mismo día", "1 mL EDTA", [
    { name: "Resultados", fields: [
      { name: "Plaquetas", unit: "x10³/µL", refCanine: "200 – 500", refFeline: "200 – 500", technique: "Contador automático" },
      { name: "VPM", unit: "fL", refCanine: "6.1 – 10.1", refFeline: "12.0 – 17.5", technique: "Contador automático" },
    ]},
  ])
  await upsertTemplate("Reticulocitos", "Hematología", "Mismo día", "1 mL EDTA", [])
  await upsertTemplate("Hemopárasitos", "Hematología", "Mismo día", "1 mL EDTA", [
    { name: "Resultados", fields: [
      { name: "Hemoparásitos observados", fieldType: "text", technique: "Microscopía óptica" },
      { name: "Descripción", fieldType: "text", technique: "Microscopía óptica" },
      { name: "Diagnóstico", fieldType: "text" },
    ]},
  ])
  await upsertTemplate("Control Hospitalario", "Hematología", "Mismo día", "1 mL EDTA", [])
  await upsertTemplate("Test Rápido FIV/FeLV", "Hematología", "Mismo día", "0.5 mL suero", [])

  // ── COPROLOGÍA ────────────────────────────────────────────────────────
  console.log("\nCoprología:")
  await upsertTemplate("Coloración Gram (Coprológico)", "Coprología", "Mismo día", "Fresco de heces", [
    { name: "Resultados", fields: [
      { name: "Flora grampositiva", fieldType: "text", technique: "Coloración Gram" },
      { name: "Flora gramnegativa", fieldType: "text", technique: "Coloración Gram" },
      { name: "Observaciones", fieldType: "text" },
    ]},
  ])
  await upsertTemplate("Coloración Wright (Coprológico)", "Coprología", "Mismo día", "Fresco de heces", [
    { name: "Resultados", fields: [
      { name: "Células observadas", fieldType: "text", technique: "Coloración Wright" },
      { name: "Microorganismos", fieldType: "text", technique: "Coloración Wright" },
      { name: "Observaciones", fieldType: "text" },
    ]},
  ])
  await upsertTemplate("Coprológico (Flotación y Directo)", "Coprología", "Mismo día", "5 g heces frescas", [
    { name: "Resultados", fields: [
      { name: "Parasitología directa", fieldType: "text", technique: "Montaje directo" },
      { name: "Parasitología por flotación", fieldType: "text", technique: "Flotación con sulfato de zinc" },
      { name: "Diagnóstico", fieldType: "text" },
    ]},
  ])
  await upsertTemplate("Coprológico Seriado (5 muestras)", "Coprología", "48h", "5 muestras de heces (días alternos)", [
    { name: "Resultados", fields: [
      { name: "Muestra 1", fieldType: "text", technique: "Flotación / directo" },
      { name: "Muestra 2", fieldType: "text", technique: "Flotación / directo" },
      { name: "Muestra 3", fieldType: "text", technique: "Flotación / directo" },
      { name: "Muestra 4", fieldType: "text", technique: "Flotación / directo" },
      { name: "Muestra 5", fieldType: "text", technique: "Flotación / directo" },
      { name: "Diagnóstico final", fieldType: "text" },
    ]},
  ])
  await upsertTemplate("Coproscópico", "Coprología", "Mismo día", "5 g heces frescas", [
    { name: "Resultados", fields: [
      { name: "Color", fieldType: "text", technique: "Observación directa" },
      { name: "Consistencia", fieldType: "text", technique: "Observación directa" },
      { name: "Olor", fieldType: "text", technique: "Observación directa" },
      { name: "Parásitos macroscópicos", fieldType: "text", technique: "Observación directa" },
      { name: "Observaciones", fieldType: "text" },
    ]},
  ])

  // ── CITOLOGÍAS REPRODUCTIVAS ──────────────────────────────────────────
  console.log("\nCitologías Reproductivas:")
  await upsertTemplate("Citología Vaginal", "Citologías Reproductivas", "48h", "Hisopo vaginal en solución salina", [])
  await upsertTemplate("Citología Vaginal Reproductiva", "Citologías Reproductivas", "48h", "Hisopo vaginal en solución salina", [
    { name: "Resultados", fields: [
      { name: "Células parabasales", unit: "%", fieldType: "number", technique: "Microscopía óptica" },
      { name: "Células intermedias", unit: "%", fieldType: "number", technique: "Microscopía óptica" },
      { name: "Células superficiales nucleadas", unit: "%", fieldType: "number", technique: "Microscopía óptica" },
      { name: "Células superficiales anucleadas", unit: "%", fieldType: "number", technique: "Microscopía óptica" },
      { name: "Fase del ciclo estral", fieldType: "text", technique: "Interpretación citológica" },
      { name: "Observaciones", fieldType: "text" },
    ]},
  ])
  await upsertTemplate("Citología Diagnóstica Reproductiva", "Citologías Reproductivas", "48h", "Placa fijada / hisopo", [
    { name: "Hallazgos", fields: [
      { name: "Tipo celular predominante", fieldType: "text", technique: "Microscopía óptica" },
      { name: "Descripción microscópica", fieldType: "text", technique: "Microscopía óptica" },
      { name: "Diagnóstico citológico", fieldType: "text", technique: "Microscopía óptica" },
      { name: "Recomendaciones", fieldType: "text" },
    ]},
  ])

  // ── UROANÁLISIS ───────────────────────────────────────────────────────
  console.log("\nUroanálisis:")
  await upsertTemplate("Coloración Gram (Orina)", "Uroanálisis", "Mismo día", "5 mL orina fresca", [
    { name: "Resultados", fields: [
      { name: "Flora grampositiva", fieldType: "text", technique: "Coloración Gram" },
      { name: "Flora gramnegativa", fieldType: "text", technique: "Coloración Gram" },
      { name: "Observaciones", fieldType: "text" },
    ]},
  ])
  await upsertTemplate("Parcial de Orina", "Uroanálisis", "Mismo día", "5 mL orina fresca (máx 2h)", [
    { name: "Propiedades físicas", fields: [
      { name: "Color", refCanine: "Amarillo", refFeline: "Amarillo", fieldType: "text", technique: "Observación directa" },
      { name: "Aspecto", refCanine: "Claro", refFeline: "Claro", fieldType: "select", technique: "Observación directa" },
      { name: "Densidad", refCanine: "1.015 – 1.045", refFeline: "1.020 – 1.060", technique: "Refractometría" },
    ]},
    { name: "Propiedades químicas", fields: [
      { name: "pH", refCanine: "5.5 – 7.5", refFeline: "5.5 – 7.5", technique: "Tira reactiva" },
      { name: "Proteínas", refCanine: "Negativo", refFeline: "Negativo", fieldType: "select", technique: "Tira reactiva" },
      { name: "Glucosa", refCanine: "Negativo", refFeline: "Negativo", fieldType: "select", technique: "Tira reactiva" },
      { name: "Cetonas", refCanine: "Negativo", refFeline: "Negativo", fieldType: "select", technique: "Tira reactiva" },
      { name: "Sangre oculta", refCanine: "Negativo", refFeline: "Negativo", fieldType: "select", technique: "Tira reactiva" },
    ]},
    { name: "Sedimento", fields: [
      { name: "Leucocitos", unit: "/campo", refCanine: "0 – 5", refFeline: "0 – 5", technique: "Microscopía x40" },
      { name: "Eritrocitos", unit: "/campo", refCanine: "0 – 5", refFeline: "0 – 5", technique: "Microscopía x40" },
      { name: "Bacterias", fieldType: "text", technique: "Microscopía x40" },
    ]},
  ])
  await upsertTemplate("Uroanálisis Completo", "Uroanálisis", "Mismo día", "5 mL orina fresca (máx 2h)", [])
  await upsertTemplate("Relación Proteína/Creatinina Urinaria (UPC)", "Uroanálisis", "Mismo día", "5 mL orina fresca", [])

  // ── PERFILES QUÍMICA SANGUÍNEA ────────────────────────────────────────
  console.log("\nPerfiles Química Sanguínea:")
  await upsertTemplate("Perfil Básico", "Perfiles Química Sanguínea", "24h", "2 mL suero (tubo seco)", [
    { name: "Resultados", fields: [
      { name: "BUN", unit: "mg/dL", refCanine: "7 – 27", refFeline: "14 – 36", technique: "Ureasa UV" },
      { name: "Creatinina", unit: "mg/dL", refCanine: "0.5 – 1.5", refFeline: "0.8 – 2.4", technique: "Jaffé cinético" },
      { name: "ALT (GPT)", unit: "U/L", refCanine: "10 – 88", refFeline: "10 – 100", technique: "UV IFCC" },
      { name: "Glucosa", unit: "mg/dL", refCanine: "65 – 118", refFeline: "70 – 150", technique: "GOD-PAP" },
      { name: "Proteínas totales", unit: "g/dL", refCanine: "5.4 – 7.5", refFeline: "5.7 – 8.9", technique: "Biuret" },
    ]},
  ])
  await upsertTemplate("Perfil Completo", "Perfiles Química Sanguínea", "24h", "3 mL suero (tubo seco)", [
    { name: "Resultados", fields: [
      { name: "BUN", unit: "mg/dL", refCanine: "7 – 27", refFeline: "14 – 36", technique: "Ureasa UV" },
      { name: "Creatinina", unit: "mg/dL", refCanine: "0.5 – 1.5", refFeline: "0.8 – 2.4", technique: "Jaffé cinético" },
      { name: "ALT (GPT)", unit: "U/L", refCanine: "10 – 88", refFeline: "10 – 100", technique: "UV IFCC" },
      { name: "AST (GOT)", unit: "U/L", refCanine: "0 – 50", refFeline: "0 – 50", technique: "UV IFCC" },
      { name: "FA (Fosfatasa alcalina)", unit: "U/L", refCanine: "20 – 150", refFeline: "10 – 72", technique: "pNPP" },
      { name: "GGT", unit: "U/L", refCanine: "1 – 12", refFeline: "1 – 10", technique: "IFCC" },
      { name: "Bilirrubina total", unit: "mg/dL", refCanine: "0.1 – 0.6", refFeline: "0.1 – 0.6", technique: "Diazo" },
      { name: "Glucosa", unit: "mg/dL", refCanine: "65 – 118", refFeline: "70 – 150", technique: "GOD-PAP" },
      { name: "Proteínas totales", unit: "g/dL", refCanine: "5.4 – 7.5", refFeline: "5.7 – 8.9", technique: "Biuret" },
      { name: "Albumina", unit: "g/dL", refCanine: "2.6 – 4.0", refFeline: "2.1 – 3.3", technique: "Bromocresol verde" },
      { name: "Globulinas", unit: "g/dL", refCanine: "2.3 – 4.5", refFeline: "2.6 – 5.1", technique: "Calculado", fieldType: "calculated", calcFormula: "proteinas_totales - albumina" },
      { name: "Fósforo", unit: "mg/dL", refCanine: "2.5 – 6.8", refFeline: "3.1 – 7.5", technique: "Fosfomolibdato UV" },
      { name: "Sodio", unit: "mEq/L", refCanine: "141 – 152", refFeline: "147 – 156", technique: "ISE" },
      { name: "Potasio", unit: "mEq/L", refCanine: "3.5 – 5.8", refFeline: "3.4 – 5.6", technique: "ISE" },
    ]},
  ])
  await upsertTemplate("Perfil Diabético", "Perfiles Química Sanguínea", "24h", "2 mL suero (tubo seco)", [
    { name: "Resultados", fields: [
      { name: "Glucosa", unit: "mg/dL", refCanine: "65 – 118", refFeline: "70 – 150", technique: "GOD-PAP" },
      { name: "Fructosamina", unit: "µmol/L", refCanine: "225 – 365", refFeline: "190 – 365", technique: "Nitroazul de tetrazolio" },
      { name: "BUN", unit: "mg/dL", refCanine: "7 – 27", refFeline: "14 – 36", technique: "Ureasa UV" },
      { name: "Creatinina", unit: "mg/dL", refCanine: "0.5 – 1.5", refFeline: "0.8 – 2.4", technique: "Jaffé cinético" },
      { name: "ALT (GPT)", unit: "U/L", refCanine: "10 – 88", refFeline: "10 – 100", technique: "UV IFCC" },
    ]},
  ])
  await upsertTemplate("Perfil Gato Adulto", "Perfiles Química Sanguínea", "24h", "2 mL suero (tubo seco)", [
    { name: "Resultados", fields: [
      { name: "BUN", unit: "mg/dL", refFeline: "14 – 36", technique: "Ureasa UV" },
      { name: "Creatinina", unit: "mg/dL", refFeline: "0.8 – 2.4", technique: "Jaffé cinético" },
      { name: "SDMA", unit: "µg/dL", refFeline: "< 14", technique: "ELISA" },
      { name: "Fósforo", unit: "mg/dL", refFeline: "3.1 – 7.5", technique: "Fosfomolibdato UV" },
      { name: "ALT (GPT)", unit: "U/L", refFeline: "10 – 100", technique: "UV IFCC" },
      { name: "Glucosa", unit: "mg/dL", refFeline: "70 – 150", technique: "GOD-PAP" },
      { name: "Proteínas totales", unit: "g/dL", refFeline: "5.7 – 8.9", technique: "Biuret" },
      { name: "Potasio", unit: "mEq/L", refFeline: "3.4 – 5.6", technique: "ISE" },
    ]},
  ])
  await upsertTemplate("Perfil Gato", "Perfiles Química Sanguínea", "24h", "2 mL suero (tubo seco)", [
    { name: "Resultados", fields: [
      { name: "BUN", unit: "mg/dL", refFeline: "14 – 36", technique: "Ureasa UV" },
      { name: "Creatinina", unit: "mg/dL", refFeline: "0.8 – 2.4", technique: "Jaffé cinético" },
      { name: "ALT (GPT)", unit: "U/L", refFeline: "10 – 100", technique: "UV IFCC" },
      { name: "Glucosa", unit: "mg/dL", refFeline: "70 – 150", technique: "GOD-PAP" },
      { name: "Proteínas totales", unit: "g/dL", refFeline: "5.7 – 8.9", technique: "Biuret" },
    ]},
  ])
  await upsertTemplate("Perfil Hepático", "Perfiles Química Sanguínea", "24h", "2 mL suero (tubo seco)", [])
  await upsertTemplate("Perfil Hepático Sencillo", "Perfiles Química Sanguínea", "24h", "2 mL suero (tubo seco)", [
    { name: "Resultados", fields: [
      { name: "ALT (GPT)", unit: "U/L", refCanine: "10 – 88", refFeline: "10 – 100", technique: "UV IFCC" },
      { name: "FA (Fosfatasa alcalina)", unit: "U/L", refCanine: "20 – 150", refFeline: "10 – 72", technique: "pNPP" },
      { name: "GGT", unit: "U/L", refCanine: "1 – 12", refFeline: "1 – 10", technique: "IFCC" },
    ]},
  ])
  await upsertTemplate("Perfil Hepático Completo", "Perfiles Química Sanguínea", "24h", "2 mL suero (tubo seco)", [
    { name: "Resultados", fields: [
      { name: "ALT (GPT)", unit: "U/L", refCanine: "10 – 88", refFeline: "10 – 100", technique: "UV IFCC" },
      { name: "AST (GOT)", unit: "U/L", refCanine: "0 – 50", refFeline: "0 – 50", technique: "UV IFCC" },
      { name: "FA (Fosfatasa alcalina)", unit: "U/L", refCanine: "20 – 150", refFeline: "10 – 72", technique: "pNPP" },
      { name: "GGT", unit: "U/L", refCanine: "1 – 12", refFeline: "1 – 10", technique: "IFCC" },
      { name: "Bilirrubina total", unit: "mg/dL", refCanine: "0.1 – 0.6", refFeline: "0.1 – 0.6", technique: "Diazo" },
      { name: "Bilirrubina directa", unit: "mg/dL", refCanine: "0.0 – 0.2", refFeline: "0.0 – 0.2", technique: "Diazo" },
      { name: "Bilirrubina indirecta", unit: "mg/dL", refCanine: "0.0 – 0.4", refFeline: "0.0 – 0.4", technique: "Calculado", fieldType: "calculated", calcFormula: "bilirrubina_total - bilirrubina_directa" },
      { name: "Proteínas totales", unit: "g/dL", refCanine: "5.4 – 7.5", refFeline: "5.7 – 8.9", technique: "Biuret" },
      { name: "Albumina", unit: "g/dL", refCanine: "2.6 – 4.0", refFeline: "2.1 – 3.3", technique: "Bromocresol verde" },
      { name: "Globulinas", unit: "g/dL", refCanine: "2.3 – 4.5", refFeline: "2.6 – 5.1", technique: "Calculado", fieldType: "calculated", calcFormula: "proteinas_totales - albumina" },
    ]},
  ])
  await upsertTemplate("Perfil Renal", "Perfiles Química Sanguínea", "24h", "2 mL suero (tubo seco)", [])
  await upsertTemplate("Perfil Renal + Electrolitos", "Perfiles Química Sanguínea", "24h", "2 mL suero (tubo seco)", [
    { name: "Resultados", fields: [
      { name: "BUN", unit: "mg/dL", refCanine: "7 – 27", refFeline: "14 – 36", technique: "Ureasa UV" },
      { name: "Creatinina", unit: "mg/dL", refCanine: "0.5 – 1.5", refFeline: "0.8 – 2.4", technique: "Jaffé cinético" },
      { name: "SDMA", unit: "µg/dL", refCanine: "< 14", refFeline: "< 14", technique: "ELISA" },
      { name: "Fósforo", unit: "mg/dL", refCanine: "2.5 – 6.8", refFeline: "3.1 – 7.5", technique: "Fosfomolibdato UV" },
      { name: "Sodio", unit: "mEq/L", refCanine: "141 – 152", refFeline: "147 – 156", technique: "ISE" },
      { name: "Potasio", unit: "mEq/L", refCanine: "3.5 – 5.8", refFeline: "3.4 – 5.6", technique: "ISE" },
      { name: "Cloro", unit: "mEq/L", refCanine: "105 – 122", refFeline: "107 – 120", technique: "ISE" },
      { name: "Calcio", unit: "mg/dL", refCanine: "9.3 – 11.5", refFeline: "8.2 – 10.8", technique: "Arsenazo III" },
    ]},
  ])
  await upsertTemplate("Perfil Prequirúrgico", "Perfiles Química Sanguínea", "24h", "2 mL suero (tubo seco)", [])
  await upsertTemplate("Perfil Profilaxis", "Perfiles Química Sanguínea", "24h", "2 mL suero (tubo seco)", [
    { name: "Resultados", fields: [
      { name: "BUN", unit: "mg/dL", refCanine: "7 – 27", refFeline: "14 – 36", technique: "Ureasa UV" },
      { name: "Creatinina", unit: "mg/dL", refCanine: "0.5 – 1.5", refFeline: "0.8 – 2.4", technique: "Jaffé cinético" },
      { name: "ALT (GPT)", unit: "U/L", refCanine: "10 – 88", refFeline: "10 – 100", technique: "UV IFCC" },
      { name: "Glucosa", unit: "mg/dL", refCanine: "65 – 118", refFeline: "70 – 150", technique: "GOD-PAP" },
      { name: "Proteínas totales", unit: "g/dL", refCanine: "5.4 – 7.5", refFeline: "5.7 – 8.9", technique: "Biuret" },
      { name: "Hematocrito", unit: "%", refCanine: "37 – 55", refFeline: "24 – 45", technique: "Microhematocrito" },
    ]},
  ])
  await upsertTemplate("Perfil Geriátrico", "Perfiles Química Sanguínea", "24h", "3 mL suero (tubo seco)", [
    { name: "Resultados", fields: [
      { name: "BUN", unit: "mg/dL", refCanine: "7 – 27", refFeline: "14 – 36", technique: "Ureasa UV" },
      { name: "Creatinina", unit: "mg/dL", refCanine: "0.5 – 1.5", refFeline: "0.8 – 2.4", technique: "Jaffé cinético" },
      { name: "SDMA", unit: "µg/dL", refCanine: "< 14", refFeline: "< 14", technique: "ELISA" },
      { name: "ALT (GPT)", unit: "U/L", refCanine: "10 – 88", refFeline: "10 – 100", technique: "UV IFCC" },
      { name: "FA (Fosfatasa alcalina)", unit: "U/L", refCanine: "20 – 150", refFeline: "10 – 72", technique: "pNPP" },
      { name: "Glucosa", unit: "mg/dL", refCanine: "65 – 118", refFeline: "70 – 150", technique: "GOD-PAP" },
      { name: "Proteínas totales", unit: "g/dL", refCanine: "5.4 – 7.5", refFeline: "5.7 – 8.9", technique: "Biuret" },
      { name: "Albumina", unit: "g/dL", refCanine: "2.6 – 4.0", refFeline: "2.1 – 3.3", technique: "Bromocresol verde" },
      { name: "Colesterol total", unit: "mg/dL", refCanine: "125 – 270", refFeline: "75 – 220", technique: "Colesterol oxidasa" },
      { name: "Fósforo", unit: "mg/dL", refCanine: "2.5 – 6.8", refFeline: "3.1 – 7.5", technique: "Fosfomolibdato UV" },
      { name: "Sodio", unit: "mEq/L", refCanine: "141 – 152", refFeline: "147 – 156", technique: "ISE" },
      { name: "Potasio", unit: "mEq/L", refCanine: "3.5 – 5.8", refFeline: "3.4 – 5.6", technique: "ISE" },
      { name: "T4 (Tiroxina)", unit: "µg/dL", refCanine: "1.0 – 4.0", refFeline: "0.8 – 4.0", technique: "ELISA" },
    ]},
  ])

  // ── CITOLOGÍAS DE PIEL ────────────────────────────────────────────────
  console.log("\nCitologías de Piel:")
  await upsertTemplate("Citología Diagnóstica", "Citologías de Piel", "48h", "Placa fijada con alcohol / tinción Diff-Quick", [])
  await upsertTemplate("Citología de Oído", "Citologías de Piel", "48h", "Hisopo con material de oído", [])
  await upsertTemplate("Tricograma", "Citologías de Piel", "48h", "Hisopado de pelos de la zona afectada", [
    { name: "Resultados", fields: [
      { name: "Fase de crecimiento (anagen/telogen)", fieldType: "text", technique: "Microscopía óptica" },
      { name: "Estructura del tallo piloso", fieldType: "text", technique: "Microscopía óptica" },
      { name: "Parásitos / hongos observados", fieldType: "text", technique: "Microscopía óptica" },
      { name: "Diagnóstico", fieldType: "text" },
    ]},
  ])
  await upsertTemplate("Raspado de Piel (KOH y Ácaros)", "Citologías de Piel", "48h", "Raspado profundo de piel", [
    { name: "Resultados", fields: [
      { name: "KOH - Elementos fúngicos", fieldType: "text", technique: "KOH 10%" },
      { name: "Ácaros observados", fieldType: "text", technique: "Microscopía óptica" },
      { name: "Diagnóstico", fieldType: "text" },
    ]},
  ])

  // ── QUÍMICA SANGUÍNEA (analitos individuales) ─────────────────────────
  console.log("\nQuímica Sanguínea:")
  await upsertTemplate("Glucosa", "Química Sanguínea", "24h", "1 mL suero (tubo seco)", [])
  await upsertTemplate("Proteínas Totales, Albumina y Globulinas", "Química Sanguínea", "24h", "2 mL suero (tubo seco)", [])
  await upsertTemplate("Panel Electrolítico", "Química Sanguínea", "24h", "2 mL suero (tubo seco)", [])

  const analitos: Array<{ name: string; unit: string; refCanine?: string; refFeline?: string; technique: string }> = [
    { name: "Albumina", unit: "g/dL", refCanine: "2.6 – 4.0", refFeline: "2.1 – 3.3", technique: "Bromocresol verde" },
    { name: "Bilirrubina Total y Directa", unit: "mg/dL", refCanine: "0.1 – 0.6", refFeline: "0.1 – 0.6", technique: "Diazo" },
    { name: "BUN (Nitrógeno Ureico)", unit: "mg/dL", refCanine: "7 – 27", refFeline: "14 – 36", technique: "Ureasa UV" },
    { name: "Calcio", unit: "mg/dL", refCanine: "9.3 – 11.5", refFeline: "8.2 – 10.8", technique: "Arsenazo III" },
    { name: "Cloro", unit: "mEq/L", refCanine: "105 – 122", refFeline: "107 – 120", technique: "ISE indirecto" },
    { name: "Colesterol Total", unit: "mg/dL", refCanine: "125 – 270", refFeline: "75 – 220", technique: "Colesterol oxidasa" },
    { name: "Creatinfosfoquinasa (CPK)", unit: "U/L", refCanine: "10 – 200", refFeline: "50 – 225", technique: "UV IFCC" },
    { name: "Creatinina", unit: "mg/dL", refCanine: "0.5 – 1.5", refFeline: "0.8 – 2.4", technique: "Jaffé cinético" },
    { name: "Fosfatasa Alcalina", unit: "U/L", refCanine: "20 – 150", refFeline: "10 – 72", technique: "pNPP" },
    { name: "Fósforo", unit: "mg/dL", refCanine: "2.5 – 6.8", refFeline: "3.1 – 7.5", technique: "Fosfomolibdato UV" },
    { name: "Gamma Glutamil Transferasa (GGT)", unit: "U/L", refCanine: "1 – 12", refFeline: "1 – 10", technique: "IFCC" },
    { name: "Lípasa", unit: "U/L", refCanine: "200 – 1800", refFeline: "100 – 1400", technique: "Turbidimetría" },
    { name: "Proteínas Plasmáticas", unit: "g/dL", refCanine: "6.0 – 8.0", refFeline: "6.0 – 8.0", technique: "Refractometría" },
    { name: "Proteínas Totales", unit: "g/dL", refCanine: "5.4 – 7.5", refFeline: "5.7 – 8.9", technique: "Biuret" },
    { name: "Sodio", unit: "mEq/L", refCanine: "141 – 152", refFeline: "147 – 156", technique: "ISE indirecto" },
    { name: "Transaminasa AST", unit: "U/L", refCanine: "0 – 50", refFeline: "0 – 50", technique: "UV IFCC" },
    { name: "Transaminasa ALT", unit: "U/L", refCanine: "10 – 88", refFeline: "10 – 100", technique: "UV IFCC" },
    { name: "Triglicéridos", unit: "mg/dL", refCanine: "20 – 150", refFeline: "10 – 114", technique: "GPO-PAP" },
  ]

  for (const t of analitos) {
    await upsertTemplate(t.name, "Química Sanguínea", "24h", "1 mL suero (tubo seco)", [
      { name: "Resultados", fields: [
        { name: t.name, unit: t.unit, refCanine: t.refCanine, refFeline: t.refFeline, technique: t.technique },
      ]},
    ])
  }

  console.log("\n¡Migración completada!")
}

main().catch(console.error).finally(() => prisma.$disconnect())
