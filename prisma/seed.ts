import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

type FieldDef = {
  name: string
  unit?: string
  refCanine?: string
  refFeline?: string
  technique?: string
  fieldType?: string
  calcFormula?: string
}

type SectionDef = { name: string; fields: FieldDef[] }
type TemplateDef = {
  name: string
  area: string
  turnaround: string
  sampleType: string
  sections: SectionDef[]
}

const TEMPLATES: TemplateDef[] = [
  // ─── HEMATOLOGÍA ──────────────────────────────────────────────────
  {
    name: "Hemograma Completo",
    area: "Hematología",
    turnaround: "Mismo día",
    sampleType: "1 mL EDTA",
    sections: [{
      name: "Resultados",
      fields: [
        { name: "Proteínas plasmáticas", unit: "g/dL", refCanine: "55 – 70", refFeline: "55 – 70", technique: "Refractometría", fieldType: "number" },
        { name: "Reticulocitos", unit: "%", refCanine: "0.0 – 1.0", refFeline: "0.0 – 1.0", technique: "Azul brillante de cresilo", fieldType: "number" },
        { name: "Hemoparásitos", technique: "Microscopía óptica", fieldType: "text" },
        { name: "Observación", fieldType: "text" },
      ],
    }],
  },
  {
    name: "Hematocrito",
    area: "Hematología",
    turnaround: "Mismo día",
    sampleType: "1 mL EDTA",
    sections: [{
      name: "Resultados",
      fields: [
        { name: "Hematocrito", unit: "%", refCanine: "37 – 55", refFeline: "24 – 45", technique: "Microhematocrito", fieldType: "number" },
        { name: "Observaciones", fieldType: "text" },
      ],
    }],
  },
  {
    name: "Hemograma Sencillo",
    area: "Hematología",
    turnaround: "Mismo día",
    sampleType: "1 mL EDTA",
    sections: [{
      name: "Resultados",
      fields: [
        { name: "Hematocrito", unit: "%", refCanine: "37 – 55", refFeline: "24 – 45", technique: "Microhematocrito", fieldType: "number" },
        { name: "Proteínas plasmáticas", unit: "g/dL", refCanine: "55 – 70", refFeline: "55 – 70", technique: "Refractometría", fieldType: "number" },
        { name: "Leucocitos estimados", unit: "x10³/µL", refCanine: "6.0 – 17.0", refFeline: "5.5 – 19.5", technique: "Estimación en frotis", fieldType: "number" },
        { name: "Observaciones", fieldType: "text" },
      ],
    }],
  },
  {
    name: "Recuento de Plaquetas",
    area: "Hematología",
    turnaround: "Mismo día",
    sampleType: "1 mL EDTA",
    sections: [{
      name: "Resultados",
      fields: [
        { name: "Plaquetas", unit: "x10³/µL", refCanine: "200 – 500", refFeline: "200 – 500", technique: "Contador automático", fieldType: "number" },
        { name: "Observaciones", fieldType: "text" },
      ],
    }],
  },
  {
    name: "Recuento de Reticulocitos",
    area: "Hematología",
    turnaround: "Mismo día",
    sampleType: "1 mL EDTA",
    sections: [{
      name: "Resultados",
      fields: [
        { name: "Reticulocitos", unit: "%", refCanine: "0.0 – 1.5", refFeline: "0.0 – 0.4", technique: "Azul brillante de cresilo", fieldType: "number" },
        { name: "Reticulocitos absolutos", unit: "x10³/µL", refCanine: "< 80", refFeline: "< 50", technique: "Calculado", fieldType: "number" },
        { name: "Interpretación", fieldType: "text" },
      ],
    }],
  },
  {
    name: "Hemoparásitos",
    area: "Hematología",
    turnaround: "Mismo día",
    sampleType: "1 mL EDTA",
    sections: [{
      name: "Resultado",
      fields: [
        { name: "Hallazgos en frotis", technique: "Microscopía óptica", fieldType: "text" },
        { name: "Observaciones", fieldType: "text" },
      ],
    }],
  },

  // ─── COPROLOGÍA ───────────────────────────────────────────────────
  {
    name: "Coprológico (flotación y directo)",
    area: "Coprología",
    turnaround: "24h",
    sampleType: "Heces frescas",
    sections: [
      {
        name: "Análisis Macroscópico",
        fields: [
          { name: "Consistencia", fieldType: "text" },
          { name: "Color", fieldType: "text" },
          { name: "Sangre", refCanine: "No se observa", refFeline: "No se observa", fieldType: "text" },
          { name: "Moco", refCanine: "No se observa", refFeline: "No se observa", fieldType: "text" },
          { name: "Larvas", refCanine: "No se observa", refFeline: "No se observa", fieldType: "text" },
          { name: "Gusanos redondos", refCanine: "No se observa", refFeline: "No se observa", fieldType: "text" },
          { name: "Otros", fieldType: "text" },
        ],
      },
      {
        name: "Análisis Microscópico",
        fields: [
          { name: "Formas parasitarias (frotis directo)", refCanine: "No se observa parásitos", refFeline: "No se observa parásitos", technique: "Frotis directo", fieldType: "text" },
          { name: "Formas parasitarias (flotación)", refCanine: "No se observa parásitos", refFeline: "No se observa parásitos", technique: "Flotación", fieldType: "text" },
          { name: "Reacción leucocitaria", fieldType: "text" },
          { name: "Almidón", fieldType: "text" },
          { name: "Eritrocitos", refCanine: "No se observa", refFeline: "No se observa", fieldType: "text" },
          { name: "Fibra muscular", fieldType: "text" },
          { name: "Fibra vegetal", fieldType: "text" },
          { name: "Células vegetales", fieldType: "text" },
          { name: "Microbiota", fieldType: "text" },
          { name: "Pelos", fieldType: "text" },
          { name: "Otros hallazgos", fieldType: "text" },
        ],
      },
      {
        name: "Observaciones",
        fields: [{ name: "Observaciones generales", fieldType: "text" }],
      },
    ],
  },
  {
    name: "Coprológico seriado (3 muestras)",
    area: "Coprología",
    turnaround: "48h",
    sampleType: "Heces frescas (3 muestras en días distintos)",
    sections: [
      {
        name: "Muestra 1",
        fields: [
          { name: "Formas parasitarias (directo)", refCanine: "No se observa parásitos", refFeline: "No se observa parásitos", technique: "Frotis directo", fieldType: "text" },
          { name: "Formas parasitarias (flotación)", refCanine: "No se observa parásitos", refFeline: "No se observa parásitos", technique: "Flotación", fieldType: "text" },
          { name: "Hallazgos adicionales", fieldType: "text" },
        ],
      },
      {
        name: "Muestra 2",
        fields: [
          { name: "Formas parasitarias (directo)", refCanine: "No se observa parásitos", refFeline: "No se observa parásitos", technique: "Frotis directo", fieldType: "text" },
          { name: "Formas parasitarias (flotación)", refCanine: "No se observa parásitos", refFeline: "No se observa parásitos", technique: "Flotación", fieldType: "text" },
          { name: "Hallazgos adicionales", fieldType: "text" },
        ],
      },
      {
        name: "Muestra 3",
        fields: [
          { name: "Formas parasitarias (directo)", refCanine: "No se observa parásitos", refFeline: "No se observa parásitos", technique: "Frotis directo", fieldType: "text" },
          { name: "Formas parasitarias (flotación)", refCanine: "No se observa parásitos", refFeline: "No se observa parásitos", technique: "Flotación", fieldType: "text" },
          { name: "Hallazgos adicionales", fieldType: "text" },
        ],
      },
      {
        name: "Conclusión",
        fields: [{ name: "Observaciones finales", fieldType: "text" }],
      },
    ],
  },
  {
    name: "Coproscópico",
    area: "Coprología",
    turnaround: "24h",
    sampleType: "Heces frescas",
    sections: [{
      name: "Resultado",
      fields: [
        { name: "Descripción macroscópica", fieldType: "text" },
        { name: "Observaciones microscópicas", fieldType: "text" },
        { name: "Conclusión", fieldType: "text" },
      ],
    }],
  },
  {
    name: "Coloración Gram",
    area: "Coprología",
    turnaround: "24h",
    sampleType: "Heces frescas",
    sections: [{
      name: "Resultado",
      fields: [
        { name: "Flora Gram positiva", fieldType: "text" },
        { name: "Flora Gram negativa", fieldType: "text" },
        { name: "Observaciones", fieldType: "text" },
      ],
    }],
  },
  {
    name: "Coloración Wright",
    area: "Coprología",
    turnaround: "24h",
    sampleType: "Heces frescas",
    sections: [{
      name: "Resultado",
      fields: [
        { name: "Descripción celular", technique: "Tinción Wright", fieldType: "text" },
        { name: "Observaciones", fieldType: "text" },
      ],
    }],
  },

  // ─── CITOLOGÍAS REPRODUCTIVAS ──────────────────────────────────────
  {
    name: "Citología Vaginal Reproductiva",
    area: "Citologías Reproductivas",
    turnaround: "48h",
    sampleType: "Hisopo vaginal en solución salina",
    sections: [{
      name: "Resultados",
      fields: [
        { name: "Células parabasales", unit: "%", technique: "Microscopía óptica", fieldType: "number" },
        { name: "Células intermedias", unit: "%", technique: "Microscopía óptica", fieldType: "number" },
        { name: "Células superficiales nucleadas", unit: "%", technique: "Microscopía óptica", fieldType: "number" },
        { name: "Células superficiales anucleadas", unit: "%", technique: "Microscopía óptica", fieldType: "number" },
        { name: "Eritrocitos", technique: "Microscopía óptica", fieldType: "text" },
        { name: "Bacterias", technique: "Microscopía óptica", fieldType: "text" },
        { name: "Fase del ciclo estral", technique: "Interpretación citológica", fieldType: "text" },
        { name: "Observaciones", fieldType: "text" },
      ],
    }],
  },
  {
    name: "Citología Diagnóstica",
    area: "Citologías Reproductivas",
    turnaround: "48h",
    sampleType: "Placa fijada / tinción Diff-Quick",
    sections: [
      {
        name: "Datos de la muestra",
        fields: [
          { name: "Sitio de toma", fieldType: "text" },
          { name: "Tipo de muestra", fieldType: "text" },
          { name: "Calidad de la muestra", technique: "Microscopía óptica", fieldType: "select" },
        ],
      },
      {
        name: "Hallazgos",
        fields: [
          { name: "Tipo celular predominante", technique: "Microscopía óptica", fieldType: "text" },
          { name: "Descripción microscópica", technique: "Microscopía óptica", fieldType: "text" },
          { name: "Microorganismos observados", technique: "Microscopía óptica", fieldType: "text" },
          { name: "Diagnóstico citológico", technique: "Microscopía óptica", fieldType: "text" },
          { name: "Recomendaciones", fieldType: "text" },
        ],
      },
    ],
  },

  // ─── UROANÁLISIS ──────────────────────────────────────────────────
  {
    name: "Parcial de Orina",
    area: "Uroanálisis",
    turnaround: "Mismo día",
    sampleType: "5 mL orina fresca (máx 2h)",
    sections: [
      {
        name: "Examen Físico",
        fields: [
          { name: "Aspecto", refCanine: "Claro", refFeline: "Claro", technique: "Observación directa", fieldType: "text" },
          { name: "Color", refCanine: "Amarillo", refFeline: "Amarillo", technique: "Observación directa", fieldType: "text" },
        ],
      },
      {
        name: "Examen Químico",
        fields: [
          { name: "Densidad específica", refCanine: "1.015 – 1.045", refFeline: "1.020 – 1.060", technique: "Refractometría", fieldType: "number" },
          { name: "pH", refCanine: "5.5 – 7.5", refFeline: "5.5 – 7.5", technique: "Tira reactiva", fieldType: "number" },
          { name: "Proteínas", refCanine: "Negativo", refFeline: "Negativo", technique: "Tira reactiva", fieldType: "select" },
          { name: "Leucocitos", technique: "Tira reactiva", fieldType: "text" },
          { name: "Glucosa", refCanine: "Negativo", refFeline: "Negativo", technique: "Tira reactiva", fieldType: "select" },
          { name: "Cetónicos", refCanine: "Negativo", refFeline: "Negativo", technique: "Tira reactiva", fieldType: "select" },
          { name: "Urobilinógeno", refCanine: "0.1 – 1.0 EU/dL", refFeline: "0.1 – 1.0 EU/dL", technique: "Tira reactiva", fieldType: "text" },
          { name: "Bilirrubina", refCanine: "Negativo / trazas", refFeline: "Negativo", technique: "Tira reactiva", fieldType: "select" },
          { name: "Sangre", refCanine: "Negativo", refFeline: "Negativo", technique: "Tira reactiva", fieldType: "select" },
          { name: "Nitritos", refCanine: "Negativo", refFeline: "Negativo", technique: "Tira reactiva", fieldType: "select" },
        ],
      },
      {
        name: "Examen Microscópico",
        fields: [
          { name: "Eritrocitos", unit: "/campo", refCanine: "0 – 5", refFeline: "0 – 5", technique: "Microscopía x40", fieldType: "text" },
          { name: "Leucocitos", unit: "/campo", refCanine: "0 – 5", refFeline: "0 – 5", technique: "Microscopía x40", fieldType: "text" },
          { name: "C. Epiteliales Altas", technique: "Microscopía x40", fieldType: "text" },
          { name: "C. Epiteliales Superficiales", technique: "Microscopía x40", fieldType: "text" },
          { name: "C. Epiteliales de Transición", technique: "Microscopía x40", fieldType: "text" },
          { name: "Bacterias", refCanine: "Ninguna", refFeline: "Ninguna", technique: "Microscopía x40", fieldType: "text" },
          { name: "Hongos", technique: "Microscopía x40", fieldType: "text" },
          { name: "Espermatozoides", technique: "Microscopía x40", fieldType: "text" },
          { name: "Cilindros", refCanine: "Ninguno", refFeline: "Ninguno", technique: "Microscopía x10", fieldType: "text" },
          { name: "Cristales", refCanine: "Escasos", refFeline: "Escasos", technique: "Microscopía x40", fieldType: "text" },
          { name: "Moco", technique: "Microscopía x10", fieldType: "text" },
          { name: "Otros", fieldType: "text" },
        ],
      },
    ],
  },
  {
    name: "Relación UPC (Proteína/Creatinina Urinaria)",
    area: "Uroanálisis",
    turnaround: "Mismo día",
    sampleType: "5 mL orina fresca",
    sections: [{
      name: "Resultados",
      fields: [
        { name: "Proteínas urinarias", unit: "mg/dL", technique: "Biuret", fieldType: "number" },
        { name: "Creatinina urinaria", unit: "mg/dL", technique: "Jaffé cinético", fieldType: "number" },
        { name: "Relación UPC", refCanine: "< 0.2 normal · 0.2–0.5 borderline · > 0.5 proteinuria", refFeline: "< 0.2 normal · 0.2–0.4 borderline · > 0.4 proteinuria", technique: "Calculado", fieldType: "calculated", calcFormula: "proteinas_urinarias / creatinina_urinaria" },
        { name: "Interpretación", fieldType: "text" },
      ],
    }],
  },
  {
    name: "Coloración Gram (Orina)",
    area: "Uroanálisis",
    turnaround: "Mismo día",
    sampleType: "5 mL orina fresca",
    sections: [{
      name: "Resultado",
      fields: [
        { name: "Flora Gram positiva", fieldType: "text" },
        { name: "Flora Gram negativa", fieldType: "text" },
        { name: "Observaciones", fieldType: "text" },
      ],
    }],
  },

  // ─── CITOLOGÍAS DE PIEL ───────────────────────────────────────────
  {
    name: "Citología de Oído",
    area: "Citologías de Piel",
    turnaround: "48h",
    sampleType: "Hisopo con material de oído",
    sections: [{
      name: "Resultado",
      fields: [
        { name: "Oído evaluado", fieldType: "select" },
        { name: "Resultado / Descripción", technique: "Microscopía óptica + Gram", fieldType: "text" },
        { name: "Observaciones", fieldType: "text" },
      ],
    }],
  },
  {
    name: "Tricograma",
    area: "Citologías de Piel",
    turnaround: "48h",
    sampleType: "Pelos con raíz",
    sections: [{
      name: "Resultado",
      fields: [
        { name: "Fase del ciclo piloso", technique: "Microscopía óptica", fieldType: "text" },
        { name: "Morfología de la cutícula", technique: "Microscopía óptica", fieldType: "text" },
        { name: "Hongos observados", technique: "Microscopía óptica", fieldType: "text" },
        { name: "Parásitos observados", technique: "Microscopía óptica", fieldType: "text" },
        { name: "Observaciones", fieldType: "text" },
      ],
    }],
  },
  {
    name: "Raspado de Piel (KOH + Ácaros)",
    area: "Citologías de Piel",
    turnaround: "48h",
    sampleType: "Raspado profundo de piel",
    sections: [{
      name: "Resultado",
      fields: [
        { name: "Ácaros Demodex", refCanine: "No ácaros", refFeline: "No ácaros", technique: "Microscopía óptica", fieldType: "text" },
        { name: "Ácaros Sarcoptes", refCanine: "No ácaros", refFeline: "No ácaros", technique: "Microscopía óptica", fieldType: "text" },
        { name: "Hongos (observación directa)", technique: "Microscopía óptica", fieldType: "text" },
        { name: "Microscópico directo", refCanine: "Negativo", refFeline: "Negativo", technique: "Frotis directo", fieldType: "select" },
        { name: "Hidróxido de potasio (KOH)", technique: "KOH 10%", fieldType: "select" },
        { name: "Observaciones", fieldType: "text" },
      ],
    }],
  },

  // ─── PERFILES QUÍMICA SANGUÍNEA ───────────────────────────────────
  {
    name: "Perfil Básico",
    area: "Perfiles Química Sanguínea",
    turnaround: "24h",
    sampleType: "2 mL suero (tubo seco)",
    sections: [{
      name: "Resultados",
      fields: [
        { name: "Glucosa", unit: "mg/dL", refCanine: "60 – 120", refFeline: "60 – 175", technique: "Trinder (punto final)", fieldType: "number" },
        { name: "Proteínas totales", unit: "g/dL", refCanine: "5.3 – 7.6", refFeline: "6.5 – 8.9", technique: "Biuret (punto final)", fieldType: "number" },
        { name: "Albumina", unit: "g/dL", refCanine: "2.4 – 3.9", refFeline: "2.3 – 3.6", technique: "Tinción BCG", fieldType: "number" },
        { name: "Globulinas", unit: "g/dL", refCanine: "2.0 – 4.0", refFeline: "2.6 – 4.5", technique: "Parámetro calculado", fieldType: "calculated", calcFormula: "proteinas_totales - albumina" },
        { name: "ALT/GPT", unit: "ul/L", refCanine: "10.0 – 100.0", refFeline: "10.0 – 100.0", technique: "FSRIFCC (Cinético)", fieldType: "number" },
        { name: "Fosfatasa alcalina", unit: "ul/L", refCanine: "1.0 – 212.0", refFeline: "1.0 – 112.0", technique: "FSR (Cinética)", fieldType: "number" },
        { name: "Creatinina", unit: "mg/dL", refCanine: "0.5 – 1.5", refFeline: "0.7 – 1.9", technique: "Colorimétrico (Tiempo fijo)", fieldType: "number" },
        { name: "Nitrógeno ureico (BUN)", unit: "mg/dL", refCanine: "7.0 – 21.5", refFeline: "20.0 – 50.0", technique: "GLDH (Tiempo fijo)", fieldType: "number" },
        { name: "Observaciones", fieldType: "text" },
      ],
    }],
  },
  {
    name: "Perfil Completo",
    area: "Perfiles Química Sanguínea",
    turnaround: "24h",
    sampleType: "2 mL suero (tubo seco)",
    sections: [{
      name: "Resultados",
      fields: [
        { name: "Glucosa", unit: "mg/dL", refCanine: "60 – 120", refFeline: "60 – 175", technique: "Trinder (punto final)", fieldType: "number" },
        { name: "Proteínas totales", unit: "g/dL", refCanine: "5.3 – 7.6", refFeline: "6.5 – 8.9", technique: "Biuret (punto final)", fieldType: "number" },
        { name: "Albumina", unit: "g/dL", refCanine: "2.4 – 3.9", refFeline: "2.3 – 3.6", technique: "Tinción BCG", fieldType: "number" },
        { name: "Globulinas", unit: "g/dL", refCanine: "2.0 – 4.0", refFeline: "2.6 – 4.5", technique: "Parámetro calculado", fieldType: "calculated", calcFormula: "proteinas_totales - albumina" },
        { name: "ALT/GPT", unit: "ul/L", refCanine: "10.0 – 100.0", refFeline: "10.0 – 100.0", technique: "FSRIFCC (Cinético)", fieldType: "number" },
        { name: "Fosfatasa alcalina", unit: "ul/L", refCanine: "1.0 – 212.0", refFeline: "1.0 – 112.0", technique: "FSR (Cinética)", fieldType: "number" },
        { name: "Creatinina", unit: "mg/dL", refCanine: "0.5 – 1.5", refFeline: "0.7 – 1.9", technique: "Colorimétrico (Tiempo fijo)", fieldType: "number" },
        { name: "Nitrógeno ureico (BUN)", unit: "mg/dL", refCanine: "7.0 – 21.5", refFeline: "20.0 – 50.0", technique: "GLDH (Tiempo fijo)", fieldType: "number" },
        { name: "AST", unit: "Ul/L", refCanine: "10.0 – 62.0", refFeline: "9.0 – 50.0", technique: "FSRIFCC (Cinético)", fieldType: "number" },
        { name: "GGT", unit: "Ul/L", refCanine: "1.0 – 9.0", refFeline: "0.0 – 10.0", technique: "Glupa-C", fieldType: "number" },
        { name: "Triglicéridos", unit: "mg/dL", refCanine: "< 150", refFeline: "25.0 – 120.0", technique: "Trinder (Punto final)", fieldType: "number" },
        { name: "Colesterol", unit: "mg/dL", refCanine: "120 – 255", refFeline: "97.0 – 207.0", technique: "Trinder (Punto final)", fieldType: "number" },
        { name: "Bilirrubina total", unit: "mg/dL", refCanine: "0.10 – 0.60", refFeline: "0.10 – 0.70", technique: "DCA", fieldType: "number" },
        { name: "Bilirrubina directa", unit: "mg/dL", refCanine: "< 0.14", refFeline: "< 0.14", technique: "DCA", fieldType: "number" },
        { name: "Bilirrubina indirecta", unit: "mg/dL", refCanine: "< 0.56", refFeline: "< 0.56", technique: "Parámetro calculado", fieldType: "calculated", calcFormula: "bilirrubina_total - bilirrubina_directa" },
        { name: "Calcio", unit: "mg/dL", refCanine: "7.4 – 11.2", refFeline: "7.4 – 11.2", technique: "Colorimétrico", fieldType: "number" },
        { name: "Fósforo", unit: "mEq/L", refCanine: "3.1 – 8.3", refFeline: "3.1 – 8.3", technique: "Colorimétrico", fieldType: "number" },
        { name: "Observaciones", fieldType: "text" },
      ],
    }],
  },
  {
    name: "Perfil Diabético",
    area: "Perfiles Química Sanguínea",
    turnaround: "24h",
    sampleType: "2 mL suero (tubo seco)",
    sections: [{
      name: "Resultados",
      fields: [
        { name: "Glucosa", unit: "mg/dL", refCanine: "60 – 120", refFeline: "60 – 175", technique: "Trinder (punto final)", fieldType: "number" },
        { name: "Fructosamina", unit: "µmol/L", refCanine: "190 – 365", refFeline: "190 – 365", technique: "Colorimétrico", fieldType: "number" },
        { name: "Proteínas totales", unit: "g/dL", refCanine: "5.3 – 7.6", refFeline: "6.5 – 8.9", technique: "Biuret", fieldType: "number" },
        { name: "Albumina", unit: "g/dL", refCanine: "2.4 – 3.9", refFeline: "2.3 – 3.6", technique: "Tinción BCG", fieldType: "number" },
        { name: "ALT/GPT", unit: "ul/L", refCanine: "10.0 – 100.0", refFeline: "10.0 – 100.0", technique: "FSRIFCC (Cinético)", fieldType: "number" },
        { name: "Creatinina", unit: "mg/dL", refCanine: "0.5 – 1.5", refFeline: "0.7 – 1.9", technique: "Colorimétrico", fieldType: "number" },
        { name: "Nitrógeno ureico (BUN)", unit: "mg/dL", refCanine: "7.0 – 21.5", refFeline: "20.0 – 50.0", technique: "GLDH", fieldType: "number" },
        { name: "Triglicéridos", unit: "mg/dL", refCanine: "< 150", refFeline: "25.0 – 120.0", technique: "Trinder", fieldType: "number" },
        { name: "Colesterol", unit: "mg/dL", refCanine: "120 – 255", refFeline: "97.0 – 207.0", technique: "Trinder", fieldType: "number" },
        { name: "Observaciones", fieldType: "text" },
      ],
    }],
  },
  {
    name: "Perfil Gato Adulto",
    area: "Perfiles Química Sanguínea",
    turnaround: "24h",
    sampleType: "2 mL suero (tubo seco)",
    sections: [{
      name: "Resultados",
      fields: [
        { name: "Glucosa", unit: "mg/dL", refFeline: "60 – 175", technique: "Trinder (punto final)", fieldType: "number" },
        { name: "Proteínas totales", unit: "g/dL", refFeline: "6.5 – 8.9", technique: "Biuret (punto final)", fieldType: "number" },
        { name: "Albumina", unit: "g/dL", refFeline: "2.3 – 3.6", technique: "Tinción BCG", fieldType: "number" },
        { name: "Globulinas", unit: "g/dL", refFeline: "2.6 – 4.5", technique: "Parámetro calculado", fieldType: "calculated", calcFormula: "proteinas_totales - albumina" },
        { name: "ALT/GPT", unit: "ul/L", refFeline: "10.0 – 100.0", technique: "FSRIFCC (Cinético)", fieldType: "number" },
        { name: "Fosfatasa alcalina", unit: "ul/L", refFeline: "1.0 – 112.0", technique: "FSR (Cinética)", fieldType: "number" },
        { name: "Creatinina", unit: "mg/dL", refFeline: "0.7 – 1.9", technique: "Colorimétrico", fieldType: "number" },
        { name: "Nitrógeno ureico (BUN)", unit: "mg/dL", refFeline: "20.0 – 50.0", technique: "GLDH", fieldType: "number" },
        { name: "AST", unit: "Ul/L", refFeline: "9.0 – 50.0", technique: "FSRIFCC (Cinético)", fieldType: "number" },
        { name: "GGT", unit: "Ul/L", refFeline: "0.0 – 10.0", technique: "Glupa-C", fieldType: "number" },
        { name: "Triglicéridos", unit: "mg/dL", refFeline: "25.0 – 120.0", technique: "Trinder", fieldType: "number" },
        { name: "Colesterol", unit: "mg/dL", refFeline: "97.0 – 207.0", technique: "Trinder", fieldType: "number" },
        { name: "Bilirrubina total", unit: "mg/dL", refFeline: "0.10 – 0.70", technique: "DCA", fieldType: "number" },
        { name: "Bilirrubina directa", unit: "mg/dL", refFeline: "< 0.14", technique: "DCA", fieldType: "number" },
        { name: "Calcio", unit: "mg/dL", refFeline: "7.4 – 11.2", technique: "Colorimétrico", fieldType: "number" },
        { name: "Fósforo", unit: "mEq/L", refFeline: "3.1 – 8.3", technique: "Colorimétrico", fieldType: "number" },
        { name: "Observaciones", fieldType: "text" },
      ],
    }],
  },
  {
    name: "Perfil Gato",
    area: "Perfiles Química Sanguínea",
    turnaround: "24h",
    sampleType: "2 mL suero (tubo seco)",
    sections: [{
      name: "Resultados",
      fields: [
        { name: "Glucosa", unit: "mg/dL", refFeline: "60 – 175", technique: "Trinder (punto final)", fieldType: "number" },
        { name: "Proteínas totales", unit: "g/dL", refFeline: "6.5 – 8.9", technique: "Biuret (punto final)", fieldType: "number" },
        { name: "Albumina", unit: "g/dL", refFeline: "2.3 – 3.6", technique: "Tinción BCG", fieldType: "number" },
        { name: "Globulinas", unit: "g/dL", refFeline: "2.6 – 4.5", technique: "Parámetro calculado", fieldType: "calculated", calcFormula: "proteinas_totales - albumina" },
        { name: "ALT/GPT", unit: "ul/L", refFeline: "10.0 – 100.0", technique: "FSRIFCC (Cinético)", fieldType: "number" },
        { name: "Fosfatasa alcalina", unit: "ul/L", refFeline: "1.0 – 112.0", technique: "FSR (Cinética)", fieldType: "number" },
        { name: "Creatinina", unit: "mg/dL", refFeline: "0.7 – 1.9", technique: "Colorimétrico", fieldType: "number" },
        { name: "Nitrógeno ureico (BUN)", unit: "mg/dL", refFeline: "20.0 – 50.0", technique: "GLDH", fieldType: "number" },
        { name: "Observaciones", fieldType: "text" },
      ],
    }],
  },
  {
    name: "Perfil Hepático Sencillo",
    area: "Perfiles Química Sanguínea",
    turnaround: "24h",
    sampleType: "2 mL suero (tubo seco)",
    sections: [{
      name: "Resultados",
      fields: [
        { name: "ALT/GPT", unit: "ul/L", refCanine: "10.0 – 100.0", refFeline: "10.0 – 100.0", technique: "FSRIFCC (Cinético)", fieldType: "number" },
        { name: "Fosfatasa alcalina", unit: "ul/L", refCanine: "1.0 – 212.0", refFeline: "1.0 – 112.0", technique: "FSR (Cinética)", fieldType: "number" },
        { name: "AST", unit: "Ul/L", refCanine: "10.0 – 62.0", refFeline: "9.0 – 50.0", technique: "FSRIFCC (Cinético)", fieldType: "number" },
        { name: "GGT", unit: "Ul/L", refCanine: "1.0 – 9.0", refFeline: "0.0 – 10.0", technique: "Glupa-C", fieldType: "number" },
        { name: "Bilirrubina total", unit: "mg/dL", refCanine: "0.10 – 0.60", refFeline: "0.10 – 0.70", technique: "DCA", fieldType: "number" },
        { name: "Observaciones", fieldType: "text" },
      ],
    }],
  },
  {
    name: "Perfil Hepático Completo",
    area: "Perfiles Química Sanguínea",
    turnaround: "24h",
    sampleType: "2 mL suero (tubo seco)",
    sections: [{
      name: "Resultados",
      fields: [
        { name: "ALT/GPT", unit: "ul/L", refCanine: "10.0 – 100.0", refFeline: "10.0 – 100.0", technique: "FSRIFCC (Cinético)", fieldType: "number" },
        { name: "Fosfatasa alcalina", unit: "ul/L", refCanine: "1.0 – 212.0", refFeline: "1.0 – 112.0", technique: "FSR (Cinética)", fieldType: "number" },
        { name: "AST", unit: "Ul/L", refCanine: "10.0 – 62.0", refFeline: "9.0 – 50.0", technique: "FSRIFCC (Cinético)", fieldType: "number" },
        { name: "GGT", unit: "Ul/L", refCanine: "1.0 – 9.0", refFeline: "0.0 – 10.0", technique: "Glupa-C", fieldType: "number" },
        { name: "Bilirrubina total", unit: "mg/dL", refCanine: "0.10 – 0.60", refFeline: "0.10 – 0.70", technique: "DCA", fieldType: "number" },
        { name: "Bilirrubina directa", unit: "mg/dL", refCanine: "< 0.14", refFeline: "< 0.14", technique: "DCA", fieldType: "number" },
        { name: "Bilirrubina indirecta", unit: "mg/dL", refCanine: "< 0.56", refFeline: "< 0.56", technique: "Parámetro calculado", fieldType: "calculated", calcFormula: "bilirrubina_total - bilirrubina_directa" },
        { name: "Proteínas totales", unit: "g/dL", refCanine: "5.3 – 7.6", refFeline: "6.5 – 8.9", technique: "Biuret", fieldType: "number" },
        { name: "Albumina", unit: "g/dL", refCanine: "2.4 – 3.9", refFeline: "2.3 – 3.6", technique: "Tinción BCG", fieldType: "number" },
        { name: "Globulinas", unit: "g/dL", refCanine: "2.0 – 4.0", refFeline: "2.6 – 4.5", technique: "Parámetro calculado", fieldType: "calculated", calcFormula: "proteinas_totales - albumina" },
        { name: "Observaciones", fieldType: "text" },
      ],
    }],
  },
  {
    name: "Perfil Renal + Electrolitos",
    area: "Perfiles Química Sanguínea",
    turnaround: "24h",
    sampleType: "2 mL suero (tubo seco)",
    sections: [{
      name: "Resultados",
      fields: [
        { name: "Creatinina", unit: "mg/dL", refCanine: "0.5 – 1.5", refFeline: "0.7 – 1.9", technique: "Colorimétrico (Tiempo fijo)", fieldType: "number" },
        { name: "Nitrógeno ureico (BUN)", unit: "mg/dL", refCanine: "7.0 – 21.5", refFeline: "20.0 – 50.0", technique: "GLDH (Tiempo fijo)", fieldType: "number" },
        { name: "Albumina", unit: "g/dL", refCanine: "2.4 – 3.9", refFeline: "2.3 – 3.6", technique: "Tinción BCG", fieldType: "number" },
        { name: "Calcio", unit: "mg/dL", refCanine: "7.4 – 11.2", refFeline: "7.4 – 11.2", technique: "Colorimétrico", fieldType: "number" },
        { name: "Fósforo", unit: "mEq/L", refCanine: "3.1 – 8.3", refFeline: "3.1 – 8.3", technique: "Colorimétrico", fieldType: "number" },
        { name: "Sodio", unit: "mEq/L", refCanine: "141 – 152", refFeline: "147 – 156", technique: "ISE indirecto", fieldType: "number" },
        { name: "Potasio", unit: "mEq/L", refCanine: "3.5 – 5.8", refFeline: "3.4 – 5.6", technique: "ISE indirecto", fieldType: "number" },
        { name: "Cloro", unit: "mEq/L", refCanine: "105 – 122", refFeline: "107 – 120", technique: "ISE indirecto", fieldType: "number" },
        { name: "Observaciones", fieldType: "text" },
      ],
    }],
  },
  {
    name: "Perfil Prequirúrgico",
    area: "Perfiles Química Sanguínea",
    turnaround: "24h",
    sampleType: "2 mL suero (tubo seco) + 1 mL EDTA",
    sections: [{
      name: "Resultados",
      fields: [
        { name: "Glucosa", unit: "mg/dL", refCanine: "60 – 120", refFeline: "60 – 175", technique: "Trinder (punto final)", fieldType: "number" },
        { name: "Proteínas totales", unit: "g/dL", refCanine: "5.3 – 7.6", refFeline: "6.5 – 8.9", technique: "Biuret", fieldType: "number" },
        { name: "ALT/GPT", unit: "ul/L", refCanine: "10.0 – 100.0", refFeline: "10.0 – 100.0", technique: "FSRIFCC (Cinético)", fieldType: "number" },
        { name: "Fosfatasa alcalina", unit: "ul/L", refCanine: "1.0 – 212.0", refFeline: "1.0 – 112.0", technique: "FSR (Cinética)", fieldType: "number" },
        { name: "Creatinina", unit: "mg/dL", refCanine: "0.5 – 1.5", refFeline: "0.7 – 1.9", technique: "Colorimétrico", fieldType: "number" },
        { name: "Nitrógeno ureico (BUN)", unit: "mg/dL", refCanine: "7.0 – 21.5", refFeline: "20.0 – 50.0", technique: "GLDH", fieldType: "number" },
        { name: "Hematocrito", unit: "%", refCanine: "37 – 55", refFeline: "24 – 45", technique: "Microhematocrito", fieldType: "number" },
        { name: "Observaciones", fieldType: "text" },
      ],
    }],
  },
  {
    name: "Perfil Profilaxis",
    area: "Perfiles Química Sanguínea",
    turnaround: "24h",
    sampleType: "2 mL suero (tubo seco)",
    sections: [{
      name: "Resultados",
      fields: [
        { name: "Glucosa", unit: "mg/dL", refCanine: "60 – 120", refFeline: "60 – 175", technique: "Trinder (punto final)", fieldType: "number" },
        { name: "Proteínas totales", unit: "g/dL", refCanine: "5.3 – 7.6", refFeline: "6.5 – 8.9", technique: "Biuret", fieldType: "number" },
        { name: "Albumina", unit: "g/dL", refCanine: "2.4 – 3.9", refFeline: "2.3 – 3.6", technique: "Tinción BCG", fieldType: "number" },
        { name: "ALT/GPT", unit: "ul/L", refCanine: "10.0 – 100.0", refFeline: "10.0 – 100.0", technique: "FSRIFCC (Cinético)", fieldType: "number" },
        { name: "Creatinina", unit: "mg/dL", refCanine: "0.5 – 1.5", refFeline: "0.7 – 1.9", technique: "Colorimétrico", fieldType: "number" },
        { name: "Nitrógeno ureico (BUN)", unit: "mg/dL", refCanine: "7.0 – 21.5", refFeline: "20.0 – 50.0", technique: "GLDH", fieldType: "number" },
        { name: "Observaciones", fieldType: "text" },
      ],
    }],
  },
  {
    name: "Perfil Geriátrico",
    area: "Perfiles Química Sanguínea",
    turnaround: "24h",
    sampleType: "2 mL suero (tubo seco)",
    sections: [{
      name: "Resultados",
      fields: [
        { name: "Glucosa", unit: "mg/dL", refCanine: "60 – 120", refFeline: "60 – 175", technique: "Trinder (punto final)", fieldType: "number" },
        { name: "Proteínas totales", unit: "g/dL", refCanine: "5.3 – 7.6", refFeline: "6.5 – 8.9", technique: "Biuret (punto final)", fieldType: "number" },
        { name: "Albumina", unit: "g/dL", refCanine: "2.4 – 3.9", refFeline: "2.3 – 3.6", technique: "Tinción BCG", fieldType: "number" },
        { name: "Globulinas", unit: "g/dL", refCanine: "2.0 – 4.0", refFeline: "2.6 – 4.5", technique: "Parámetro calculado", fieldType: "calculated", calcFormula: "proteinas_totales - albumina" },
        { name: "ALT/GPT", unit: "ul/L", refCanine: "10.0 – 100.0", refFeline: "10.0 – 100.0", technique: "FSRIFCC (Cinético)", fieldType: "number" },
        { name: "Creatinina", unit: "mg/dL", refCanine: "0.5 – 1.5", refFeline: "0.7 – 1.9", technique: "Colorimétrico (Tiempo fijo)", fieldType: "number" },
        { name: "Nitrógeno ureico (BUN)", unit: "mg/dL", refCanine: "7.0 – 21.5", refFeline: "20.0 – 50.0", technique: "GLDH (Tiempo fijo)", fieldType: "number" },
        { name: "AST", unit: "Ul/L", refCanine: "10.0 – 62.0", refFeline: "9.0 – 50.0", technique: "FSRIFCC (Cinético)", fieldType: "number" },
        { name: "Triglicéridos", unit: "mg/dL", refCanine: "< 150", refFeline: "25.0 – 120.0", technique: "Trinder (Punto final)", fieldType: "number" },
        { name: "Colesterol", unit: "mg/dL", refCanine: "120 – 255", refFeline: "97.0 – 207.0", technique: "Trinder (Punto final)", fieldType: "number" },
        { name: "Observaciones", fieldType: "text" },
      ],
    }],
  },

  // ─── QUÍMICA SANGUÍNEA (pruebas individuales) ─────────────────────
  { name: "Creatinina", area: "Química Sanguínea", turnaround: "24h", sampleType: "1 mL suero (tubo seco)", sections: [{ name: "Resultados", fields: [{ name: "Creatinina", unit: "mg/dL", refCanine: "0.5 – 1.5", refFeline: "0.7 – 1.9", technique: "Colorimétrico (Tiempo fijo)", fieldType: "number" }, { name: "Observaciones", fieldType: "text" }] }] },
  { name: "Albúmina", area: "Química Sanguínea", turnaround: "24h", sampleType: "1 mL suero (tubo seco)", sections: [{ name: "Resultados", fields: [{ name: "Albumina", unit: "g/dL", refCanine: "2.4 – 3.9", refFeline: "2.3 – 3.6", technique: "Tinción BCG", fieldType: "number" }, { name: "Observaciones", fieldType: "text" }] }] },
  { name: "Bilirrubina total y directa", area: "Química Sanguínea", turnaround: "24h", sampleType: "1 mL suero (tubo seco)", sections: [{ name: "Resultados", fields: [{ name: "Bilirrubina total", unit: "mg/dL", refCanine: "0.10 – 0.60", refFeline: "0.10 – 0.70", technique: "DCA", fieldType: "number" }, { name: "Bilirrubina directa", unit: "mg/dL", refCanine: "< 0.14", refFeline: "< 0.14", technique: "DCA", fieldType: "number" }, { name: "Bilirrubina indirecta", unit: "mg/dL", refCanine: "< 0.56", refFeline: "< 0.56", technique: "Parámetro calculado", fieldType: "calculated", calcFormula: "bilirrubina_total - bilirrubina_directa" }, { name: "Observaciones", fieldType: "text" }] }] },
  { name: "BUN (Nitrógeno ureico)", area: "Química Sanguínea", turnaround: "24h", sampleType: "1 mL suero (tubo seco)", sections: [{ name: "Resultados", fields: [{ name: "Nitrógeno ureico (BUN)", unit: "mg/dL", refCanine: "7.0 – 21.5", refFeline: "20.0 – 50.0", technique: "GLDH (Tiempo fijo)", fieldType: "number" }, { name: "Observaciones", fieldType: "text" }] }] },
  { name: "Calcio", area: "Química Sanguínea", turnaround: "24h", sampleType: "1 mL suero (tubo seco)", sections: [{ name: "Resultados", fields: [{ name: "Calcio", unit: "mg/dL", refCanine: "7.4 – 11.2", refFeline: "7.4 – 11.2", technique: "Colorimétrico", fieldType: "number" }, { name: "Observaciones", fieldType: "text" }] }] },
  { name: "Cloro", area: "Química Sanguínea", turnaround: "24h", sampleType: "1 mL suero (tubo seco)", sections: [{ name: "Resultados", fields: [{ name: "Cloro", unit: "mEq/L", refCanine: "105 – 122", refFeline: "107 – 120", technique: "ISE indirecto", fieldType: "number" }, { name: "Observaciones", fieldType: "text" }] }] },
  { name: "Colesterol total", area: "Química Sanguínea", turnaround: "24h", sampleType: "1 mL suero (tubo seco)", sections: [{ name: "Resultados", fields: [{ name: "Colesterol", unit: "mg/dL", refCanine: "120 – 255", refFeline: "97.0 – 207.0", technique: "Trinder (Punto final)", fieldType: "number" }, { name: "Observaciones", fieldType: "text" }] }] },
  { name: "Creatinfosfoquinasa (CPK)", area: "Química Sanguínea", turnaround: "24h", sampleType: "1 mL suero (tubo seco)", sections: [{ name: "Resultados", fields: [{ name: "CPK total", unit: "U/L", refCanine: "10 – 200", refFeline: "10 – 200", technique: "Cinético IFCC", fieldType: "number" }, { name: "Observaciones", fieldType: "text" }] }] },
  { name: "Fosfatasa alcalina", area: "Química Sanguínea", turnaround: "24h", sampleType: "1 mL suero (tubo seco)", sections: [{ name: "Resultados", fields: [{ name: "Fosfatasa alcalina", unit: "ul/L", refCanine: "1.0 – 212.0", refFeline: "1.0 – 112.0", technique: "FSR (Cinética)", fieldType: "number" }, { name: "Observaciones", fieldType: "text" }] }] },
  { name: "Fósforo", area: "Química Sanguínea", turnaround: "24h", sampleType: "1 mL suero (tubo seco)", sections: [{ name: "Resultados", fields: [{ name: "Fósforo", unit: "mEq/L", refCanine: "3.1 – 8.3", refFeline: "3.1 – 8.3", technique: "Colorimétrico", fieldType: "number" }, { name: "Observaciones", fieldType: "text" }] }] },
  { name: "Gamma glutamil transferasa (GGT)", area: "Química Sanguínea", turnaround: "24h", sampleType: "1 mL suero (tubo seco)", sections: [{ name: "Resultados", fields: [{ name: "GGT", unit: "Ul/L", refCanine: "1.0 – 9.0", refFeline: "0.0 – 10.0", technique: "Glupa-C", fieldType: "number" }, { name: "Observaciones", fieldType: "text" }] }] },
  { name: "Glucosa", area: "Química Sanguínea", turnaround: "24h", sampleType: "1 mL suero (tubo seco)", sections: [{ name: "Resultados", fields: [{ name: "Glucosa", unit: "mg/dL", refCanine: "60 – 120", refFeline: "60 – 175", technique: "Trinder (punto final)", fieldType: "number" }, { name: "Observaciones", fieldType: "text" }] }] },
  { name: "Lipasa", area: "Química Sanguínea", turnaround: "24h", sampleType: "1 mL suero (tubo seco)", sections: [{ name: "Resultados", fields: [{ name: "Lipasa", unit: "U/L", refCanine: "0 – 250", refFeline: "0 – 200", technique: "Colorimétrico", fieldType: "number" }, { name: "Observaciones", fieldType: "text" }] }] },
  { name: "Proteínas plasmáticas", area: "Química Sanguínea", turnaround: "Mismo día", sampleType: "1 mL EDTA", sections: [{ name: "Resultados", fields: [{ name: "Proteínas plasmáticas", unit: "g/dL", refCanine: "55 – 70", refFeline: "55 – 70", technique: "Refractometría", fieldType: "number" }, { name: "Observaciones", fieldType: "text" }] }] },
  { name: "Proteínas totales", area: "Química Sanguínea", turnaround: "24h", sampleType: "1 mL suero (tubo seco)", sections: [{ name: "Resultados", fields: [{ name: "Proteínas totales", unit: "g/dL", refCanine: "5.3 – 7.6", refFeline: "6.5 – 8.9", technique: "Biuret (punto final)", fieldType: "number" }, { name: "Observaciones", fieldType: "text" }] }] },
  {
    name: "Proteínas totales y relación A/G",
    area: "Química Sanguínea",
    turnaround: "24h",
    sampleType: "1 mL suero (tubo seco)",
    sections: [{ name: "Resultados", fields: [
      { name: "Proteínas totales", unit: "g/dL", refCanine: "5.3 – 7.6", refFeline: "6.5 – 8.9", technique: "Biuret", fieldType: "number" },
      { name: "Albumina", unit: "g/dL", refCanine: "2.4 – 3.9", refFeline: "2.3 – 3.6", technique: "Tinción BCG", fieldType: "number" },
      { name: "Globulinas", unit: "g/dL", refCanine: "2.0 – 4.0", refFeline: "2.6 – 4.5", technique: "Parámetro calculado", fieldType: "calculated", calcFormula: "proteinas_totales - albumina" },
      { name: "Relación A/G", refCanine: "0.7 – 1.5", refFeline: "0.5 – 1.0", technique: "Parámetro calculado", fieldType: "calculated", calcFormula: "albumina / globulinas" },
      { name: "Observaciones", fieldType: "text" },
    ]}],
  },
  { name: "Sodio", area: "Química Sanguínea", turnaround: "24h", sampleType: "1 mL suero (tubo seco)", sections: [{ name: "Resultados", fields: [{ name: "Sodio", unit: "mEq/L", refCanine: "141 – 152", refFeline: "147 – 156", technique: "ISE indirecto", fieldType: "number" }, { name: "Observaciones", fieldType: "text" }] }] },
  { name: "Transaminasa AST", area: "Química Sanguínea", turnaround: "24h", sampleType: "1 mL suero (tubo seco)", sections: [{ name: "Resultados", fields: [{ name: "AST (GOT)", unit: "Ul/L", refCanine: "10.0 – 62.0", refFeline: "9.0 – 50.0", technique: "FSRIFCC (Cinético)", fieldType: "number" }, { name: "Observaciones", fieldType: "text" }] }] },
  { name: "Transaminasa ALT", area: "Química Sanguínea", turnaround: "24h", sampleType: "1 mL suero (tubo seco)", sections: [{ name: "Resultados", fields: [{ name: "ALT (GPT)", unit: "ul/L", refCanine: "10.0 – 100.0", refFeline: "10.0 – 100.0", technique: "FSRIFCC (Cinético)", fieldType: "number" }, { name: "Observaciones", fieldType: "text" }] }] },
  { name: "Triglicéridos", area: "Química Sanguínea", turnaround: "24h", sampleType: "1 mL suero (tubo seco)", sections: [{ name: "Resultados", fields: [{ name: "Triglicéridos", unit: "mg/dL", refCanine: "< 150", refFeline: "25.0 – 120.0", technique: "Trinder (Punto final)", fieldType: "number" }, { name: "Observaciones", fieldType: "text" }] }] },

  // ─── OTROS ────────────────────────────────────────────────────────
  {
    name: "Tiempos de Coagulación",
    area: "Otros",
    turnaround: "24h",
    sampleType: "Plasma con citrato de sodio",
    sections: [{ name: "Resultados", fields: [
      { name: "Tiempo de Protrombina (TP)", unit: "Segundos", refCanine: "7.5 – 13.0", refFeline: "7.5 – 13.0", technique: "Viscosimetría", fieldType: "number" },
      { name: "Tiempo de tromboplastina parcial (PTT)", unit: "Segundos", refCanine: "13.1 – 25.0", refFeline: "13.1 – 25.0", technique: "Viscosimetría", fieldType: "number" },
      { name: "Observaciones", fieldType: "text" },
    ]}],
  },
]

async function main() {
  console.log("Seeding database...")

  // Clean slate — order matters for FK constraints
  await prisma.examResult.deleteMany({})
  await prisma.orderExam.deleteMany({})
  await prisma.order.deleteMany({})
  await prisma.examField.deleteMany({})
  await prisma.examSection.deleteMany({})
  await prisma.examTemplate.deleteMany({})
  await prisma.user.deleteMany({})

  // Admin user
  const adminPassword = await bcrypt.hash("petspets123", 10)
  await prisma.user.create({
    data: {
      name: "Guillermo",
      email: "guillermo@petspets.co",
      password: adminPassword,
      role: "ADMIN",
    },
  })

  // Templates
  for (const [si, t] of TEMPLATES.entries()) {
    const template = await prisma.examTemplate.create({
      data: { name: t.name, area: t.area, turnaround: t.turnaround, sampleType: t.sampleType },
    })

    for (const [sIdx, s] of t.sections.entries()) {
      const section = await prisma.examSection.create({
        data: { templateId: template.id, name: s.name, order: sIdx },
      })

      for (const [fIdx, f] of s.fields.entries()) {
        await prisma.examField.create({
          data: {
            sectionId: section.id,
            name: f.name,
            unit: f.unit ?? null,
            refCanine: f.refCanine ?? null,
            refFeline: f.refFeline ?? null,
            technique: f.technique ?? null,
            fieldType: f.fieldType ?? "number",
            calcFormula: f.calcFormula ?? null,
            order: fIdx,
          },
        })
      }
    }

    console.log(`  ✓ [${si + 1}/${TEMPLATES.length}] ${t.name}`)
  }

  console.log("Done.")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
