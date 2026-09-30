// Concilia el catálogo de exámenes con LISTA_DE_PRECIOS_PETS_AND_LAB_v3.xlsx (hoja "Claude", 102 exámenes).
//
// - Exámenes que siguen: se modifican EN SU LUGAR (nombre, área, muestra, entrega, precio y campos), para
//   que las órdenes existentes conserven sus resultados. Nunca se borra un campo que tenga resultados.
// - Exámenes que ya no están en la lista: se retiran (active = false), no se borran.
// - Exámenes nuevos y perfiles: se crean. Los perfiles se arman copiando los campos de sus exámenes
//   componentes (lib/composeTemplate.ts, igual que Promociones).
//
// Todo corre en una sola transacción. Sin --apply es un ensayo: hace todo, verifica y revierte.
//   node node_modules/tsx/dist/cli.mjs scripts/update-catalogo-precios-v3.ts [--apply]
import { PrismaClient, Prisma } from "@prisma/client"
import { composeSections, type ComposeComponent } from "../lib/composeTemplate"

const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")

const HEM = "Hematología"
const QS = "Química Sanguínea"
const URI = "Urianálisis"
const COP = "Coproparasitología"
const DER = "Dermatología"
const END = "Endocrinología"
const MIC = "Microbiología"
const INM = "Inmunología / Serología"
const PER = "Perfiles"
const HIS = "Histología e Histopatología"
const PCR = "PCR Veterinaria"

type Item = { area: string; name: string; sample: string; turnaround: string; price: number | null; includes?: string }
const it = (area: string, name: string, sample: string, turnaround: string, price: number | null, includes?: string): Item =>
  ({ area, name, sample, turnaround, price, includes })

const TIPO_SUERO = "Sangre tubo amarillo o rojo"

// ── La lista de precios v3, tal cual (solo se corrigen tildes) ─────────────────────────────────
const LIST: Item[] = [
  it(HEM, "Hemograma Simple / Proteínas Plasmáticas", "Sangre / Tubo lila", "Diario", 14000),
  it(HEM, "Hemograma Completo con Recuento de Reticulocitos", "Sangre / Tubo lila", "12-24 horas", 16000),
  it(HEM, "Hemoparásitos (Frotis Extendido y Gota Gruesa)", "Sangre / Tubo lila", "12-24 horas", 15000),
  it(HEM, "Extendido de Sangre Periférica", "Sangre periférica", "12-24 horas", 15000),
  it(HEM, "Tiempo de Tromboplastina (TPT)", "Sangre / Tubo azul", "Diario", 13000),
  it(HEM, "Tiempo de Protrombina (TP)", "Sangre / Tubo azul", "Diario", 13000),
  it(HEM, "Tiempo de Tromboplastina - Tiempo de Protrombina (TPT + TP)", "Sangre / Tubo azul", "Diario", 22000),

  it(QS, "Albúmina", TIPO_SUERO, "Diario", 12000),
  it(QS, "ALT / GPT", TIPO_SUERO, "Diario", 12000),
  it(QS, "Amilasa", TIPO_SUERO, "1 hora", 16000),
  it(QS, "Amoniaco (Ayuno)", "Sangre tubo verde", "Diario", 32000),
  it(QS, "AST / GOT", TIPO_SUERO, "Diario", 12000),
  it(QS, "Ácido Úrico", TIPO_SUERO, "Diario", 22000),
  it(QS, "Bicarbonato", TIPO_SUERO, "1 – 2 días", 45000),
  it(QS, "Bilirrubina Directa", TIPO_SUERO, "Diario", 12000),
  it(QS, "Bilirrubina Total", TIPO_SUERO, "Diario", 12000),
  it(QS, "Bilirrubinas Diferenciadas (BT + BD + BI)", TIPO_SUERO, "Diario", 20000),
  it(QS, "BUN / Nitrógeno Ureico", TIPO_SUERO, "Diario", 11000),
  it(QS, "Calcio", TIPO_SUERO, "Diario", 11000),
  it(QS, "Cloro", TIPO_SUERO, "Diario", 12000),
  it(QS, "Colesterol", TIPO_SUERO, "Diario", 11000),
  it(QS, "Creatinina", TIPO_SUERO, "Diario", 11000),
  it(QS, "CK (Creatin Fosfoquinasa)", TIPO_SUERO, "Diario", 16000),
  it(QS, "Electrolitos (Na, K, Cl, Brecha Aniónica)", TIPO_SUERO, "1 – 2 días", 30000),
  it(QS, "Fosfatasa Alcalina", TIPO_SUERO, "Diario", 11000),
  it(QS, "Fósforo", TIPO_SUERO, "Diario", 11000),
  it(QS, "GGT", TIPO_SUERO, "Diario", 13000),
  it(QS, "Glucosa", "Sangre tubo amarillo, rojo o azul", "Diario", 11000),
  it(QS, "Lipasa", TIPO_SUERO, "Diario", 23000),
  it(QS, "Proteínas Totales", "Sangre tubo lila", "Diario", 9000),
  it(QS, "Triglicéridos", TIPO_SUERO, "Diario", 11000),
  it(QS, "Fructosamina", TIPO_SUERO, "Diario", 27000),
  it(QS, "Ácidos Biliares", TIPO_SUERO, "2 días", 143000),

  it(URI, "Parcial de Orina – Completo (Tirilla Urovet, Test de Héller, Relación P/C, Sedimento, Coloración Wright)", "Orina 5 ml", "12-24 horas", 12000),
  it(URI, "Creatininuria", "Orina", "Diario", 13000),
  it(URI, "UPC (Proteinuria / Creatinuria)", "Orina", "Diario", 21000),

  it(COP, "Coprológico (Microscopía y Miniflotac)", "Materia fecal", "Diario", 11000),
  it(COP, "Coproscópico (Azúcares Reductores, pH, Sangre Oculta, Grasa Fecal, Coloración Wright)", "Materia fecal", "Diario", 25000),
  it(COP, "Sangre Oculta en Heces", "Materia fecal", "Diario", 10000),

  it(DER, "Raspado de Piel", "Piel y pelo", "12-24 horas", 12000),
  it(DER, "Tricograma", "Piel y pelo", "12-24 horas", 12000),

  it(END, "T4 Total Canina", TIPO_SUERO, "1-2 días", 70000),
  it(END, "T4 Libre", TIPO_SUERO, "1-2 días", 45000),
  it(END, "Cortisol", TIPO_SUERO, "1-2 días", 70000),
  it(END, "TSH Canina", TIPO_SUERO, "1-2 días", 70000),
  it(END, "Testosterona Total", TIPO_SUERO, "1-2 días", 55000),
  it(END, "Progesterona", TIPO_SUERO, "1-2 días", 55000),
  it(END, "Estradiol", TIPO_SUERO, "1-2 días", 100000),
  it(END, "Lipasa Pancreática Específica Canina", TIPO_SUERO, "12-24 horas", 65000),
  it(END, "Lipasa Pancreática Específica Felina", TIPO_SUERO, "12-24 horas", 65000),
  it(END, "Supresión con Dexametasona (Cortisol AM Ayuno 12h + Cortisol PM 8h Post Medicamento)", "Sangre tubo amarillo/rojo (3-5 ml)", "12-24 horas", 140000),

  it(MIC, "Cultivo de Secreciones con Antibiograma (Oídos, Tejidos, Exudados, Secreciones)", "Hisopado en medio de transporte", "5 días", 65000),
  it(MIC, "Cultivo para Hongos", "Muestra del sitio a estudiar", "30 días", 65000),
  it(MIC, "Urocultivo y Antibiograma", "Orina (5 ml)", "7 días", 65000),

  it(INM, "Distemper Canino (Moquillo)", "Hisopo con secreción ocular o nasal", "Diario", 40000),
  it(INM, "Parvovirus Canino", "Materia fecal o hisopado rectal", "Diario", 40000),
  it(INM, "Inmunodeficiencia Viral Felina (VIF) Ab – Leucemia Viral Felina (VILEF) Ag", "Sangre tubo lila", "Diario", 50000),
  it(INM, "SNAP 4DX (Ehrlichia, Anaplasma, Borrelia, Dirofilaria)", "Sangre tubo amarillo o lila", "Diario", 100000),
  it(INM, "Anticuerpos Rábicos (Incluye Resultado Original)", "Sangre tubo rojo (3-5 ml)", "35-40 días", 1000000),

  it(PER, "Perfil Pre-quirúrgico 1", "Sangre tubo rojo 1-2 ml", "Diario", 32000, "Hemograma, ALT, Creatinina, Fosfatasa Alcalina"),
  it(PER, "Perfil Pre-quirúrgico 2", "Sangre tubo rojo 1-2 ml", "Diario", 37000, "Hemograma, ALT, Creatinina, BUN-Urea, Fosfatasa Alcalina"),
  it(PER, "Perfil Pre-quirúrgico 3", "Sangre tubo heparina / rojo-amarillo 2-3 ml", "Diario", 61000, "Hemograma, ALT, BUN, Creatinina, Glucosa, Albúmina, Proteínas Totales, Fosfatasa Alcalina"),
  it(PER, "Perfil Profilaxis Canino", "Sangre tubo lila + tubo rojo o amarillo", "12-24 horas", 35000, "Hemograma, Hemoparásitos, ALT, Creatinina"),
  it(PER, "Perfil Profilaxis Felino", "Sangre tubo lila + tubo rojo o amarillo", "12-24 horas", 35000, "Hemograma, Hemoparásitos, GGT, Creatinina"),
  it(PER, "Perfil Básico Canino", "Sangre tubo lila + tubo rojo o amarillo", "12-24 horas", 60000, "Hemograma, ALT, Creatinina, Urea/BUN, Glucosa, Proteínas Totales, Albúmina, Globulinas, Calcio, Fosfatasa Alcalina"),
  it(PER, "Perfil Básico Felino", "Sangre tubo lila + tubo rojo o amarillo", "12-24 horas", 60000, "Hemograma, ALT, Creatinina, Urea/BUN, Glucosa, Proteínas Totales, Albúmina, Globulinas, Calcio, GGT"),
  it(PER, "Perfil Pre-quirúrgico 4", "Sangre tubo lila + tubo rojo o amarillo + tubo azul", "12-24 horas", 52000, "Hemograma, ALT, Creatinina, Urea/BUN, Fosfatasa Alcalina, PT, PTT"),
  it(PER, "Perfil Felino Viral", "Sangre tubo lila + tubo rojo o amarillo", "12-24 horas", 70000, "Hemograma, Hemoparásitos, ALT, Creatinina, Test Sida/Leucemia"),
  it(PER, "Perfil Canino Distemper", "Sangre tubo lila + tubo rojo o amarillo + hisopo ocular o nasal", "12-24 horas", 68000, "Hemograma, Hemoparásitos, ALT, Creatinina, Test Distemper"),
  it(PER, "Perfil Canino Parvo", "Sangre tubo lila + tubo rojo o amarillo + materia fecal", "12-24 horas", 68000, "Hemograma, Hemoparásitos, ALT, Creatinina, Coprológico, Test Parvovirus"),
  it(PER, "Perfil Hepático Canino", "Sangre tubo lila + tubo rojo o amarillo", "12-24 horas", 45000, "Hemograma, ALT, Fosfatasa Alcalina, Bilirrubina Total, Bilirrubina Directa, Bilirrubina Indirecta, Colesterol"),
  it(PER, "Perfil Hepático Felino", "Sangre tubo lila + tubo rojo o amarillo", "12-24 horas", 45000, "Hemograma, AST, GGT, Bilirrubina Total, Bilirrubina Directa, Bilirrubina Indirecta, Colesterol"),
  it(PER, "Perfil Renal Sencillo", "Sangre tubo lila + tubo rojo o amarillo", "12-24 horas", 30000, "Hemograma, Creatinina, Urea/BUN"),
  it(PER, "Perfil Renal Completo", "Sangre tubo lila + tubo rojo o amarillo + orina 5 ml", "12-24 horas", 50000, "Hemograma, Creatinina, Urea/BUN, Fósforo, Albúmina, Parcial de Orina, UPC"),
  it(PER, "Perfil Dermatológico Sencillo", "Piel y pelo", "12-24 horas", 20000, "Raspado de piel, Tricograma"),
  it(PER, "Perfil Dermatológico Sencillo 2", "Piel y pelo", "12-24 horas", 30000, "Raspado de piel, Tricograma, Coloración de Gram"),
  it(PER, "Perfil Dermatológico Completo", "Sangre tubo lila + piel y pelo + frotis de hisopado", "30 días (cultivo hongos)", 60000, "Hemograma, Cultivo para Hongos, Citología de piel"),
  it(PER, "Perfil Diabético", "Sangre tubo lila + tubo rojo o amarillo + orina 5 ml", "12-24 horas", 42000, "Hemograma, Glucosa, Fructosamina, Parcial de Orina"),
  it(PER, "Perfil Geriátrico", "Sangre tubo lila + tubo rojo o amarillo + orina 5 ml + materia fecal", "12-24 horas", 60000, "Hemograma, Hemoparásitos, ALT, Fosfatasa Alcalina, Creatinina, Urea/BUN, Colesterol, Glucosa, Parcial de Orina, Coprológico"),
  it(PER, "Perfil Integral", "Sangre tubo lila + tubo rojo o amarillo + orina 5 ml + materia fecal", "12-24 horas", 110000, "Hemograma, Hemoparásitos, ALT, Creatinina, Urea/BUN, Fosfatasa Alcalina, Proteínas Totales, Albúmina, Globulinas, Calcio, Fósforo, Colesterol, Triglicéridos, Glucosa, Bilirrubina Total, Bilirrubina Directa, Bilirrubina Indirecta, CK (Creatin Fosfoquinasa), Coprológico, Parcial de Orina"),

  it(HIS, "Citología Conjuntival", "Frotis de hisopado", "12-24 horas", 15000),
  it(HIS, "Citología de Piel", "Frotis de hisopado", "12-24 horas", 20000),
  it(HIS, "Citología Ótica - 1 Oído", "Frotis de hisopado", "12-24 horas", 12000),
  it(HIS, "Citología Ótica - 2 Oídos", "Frotis de hisopado", "12-24 horas", 20000),
  it(HIS, "Coloración para Malassezia (Wright)", "Frotis de hisopado", "12-24 horas", 12000),
  it(HIS, "Citología de Masa", "Lámina con extendido o jeringa", "48-72 horas", 50000),
  it(HIS, "Citología Masa Adicional o Contramuestra", "Lámina con extendido o jeringa", "48-72 horas", 25000),
  it(HIS, "Citología de Líquidos (Pleura, Bronco-alveolar, Sinovial, Prostático, Vesical, LCR)", "Líquido o extendido en lámina", "48-72 horas", 45000),
  it(HIS, "Histopatología (Hasta 3 Muestras o Masa)", "Tejido en formol 10%", "8 días hábiles", 160000),
  it(HIS, "Suero Autólogo", "Sangre con anticoagulante", "3 días hábiles", 10000),
  it(HIS, "Test de Rivalta", "Líquido abdominal", "12-24 horas", 12000),
  it(HIS, "Citoquímico de Líquido (Pleura, Bronco-alveolar, Sinovial, Prostático, Vesical, LCR)", "Efusión abdominal, torácica o articular", "12-24 horas", 57000),

  it(PCR, "PCR Cualitativa Hemoparásitos Canino (Ehrlichia, Anaplasma, Hepatozoon, Babesia sp.)", "Sangre EDTA (tubo lila); fase crónica: aspirado ganglionar/médula/bazo", "3 días hábiles", null),
  it(PCR, "PCR Cualitativa Parvovirus Canino", "Sangre EDTA / materia fecal / hisopado rectal", "3 días hábiles", null),
  it(PCR, "PCR Cualitativa Distemper Canino", "Hisopado / sangre EDTA / orina / materia fecal según fase clínica", "3 días hábiles", null),
  it(PCR, "PCR Cualitativa Parvovirus + Distemper Canino", "Ver tipos de muestra de cada prueba", "3 días hábiles", null),
  it(PCR, "PCR Cualitativa Dirofilaria immitis", "Sangre EDTA vena yugular — 3 muestras (mañana, tarde, noche)", "3 días hábiles", null),
  it(PCR, "PCR Cualitativa Perfil Hemoparásitos Felino (Anaplasma, Cytauxzoon, Mycoplasma, Bartonella sp.)", "Sangre EDTA (tubo lila)", "3 días hábiles", null),
  it(PCR, "PCR Cualitativa Perfil Viral Felino (Leucemia Viral, Inmunodeficiencia Viral, Mycoplasma, Bartonella)", "Sangre EDTA (tubo lila)", "3 días hábiles", null),
  it(PCR, "PCR Cualitativa Inmunodeficiencia Viral Felina", "Sangre EDTA (tubo lila)", "3 días hábiles", null),
  it(PCR, "PCR Cualitativa Leucemia Viral Felina", "Sangre EDTA (tubo lila)", "3 días hábiles", null),
  it(PCR, "Perfil Infeccioso Felino Cualitativo (PCR)", "Sangre EDTA o líquido efusivo según fase clínica", "3 días hábiles", null,
    "Leucemia, Inmunodeficiencia, Mycoplasma, Bartonella, Coronavirus mutante y entérico"),
]

// ── Exámenes actuales que siguen (nombre nuevo ← nombre actual en la base) ───────────────────────
const KEEP: Record<string, string> = {
  "Hemograma Simple / Proteínas Plasmáticas": "Hemograma Sencillo Canino",
  "Hemograma Completo con Recuento de Reticulocitos": "Hemograma Completo Canino",
  "Hemoparásitos (Frotis Extendido y Gota Gruesa)": "Hemopárasitos",
  "Tiempo de Tromboplastina - Tiempo de Protrombina (TPT + TP)": "Tiempo de Tromboplastina - Tiempo de Protrombina (TPT + TP)",
  "Albúmina": "Albúmina",
  "ALT / GPT": "Transaminasa ALT",
  "Amilasa": "Amilasa",
  "Amoniaco (Ayuno)": "Amoniaco (en Ayuno)",
  "AST / GOT": "Transaminasa AST",
  "Ácido Úrico": "Ácido Úrico",
  "Bilirrubinas Diferenciadas (BT + BD + BI)": "Bilirrubina Total y Directa",
  "BUN / Nitrógeno Ureico": "Bun (Nitrógeno Ureico) y Urea",
  "Calcio": "Calcio",
  "Colesterol": "Colesterol Total",
  "Creatinina": "Creatinina",
  "Electrolitos (Na, K, Cl, Brecha Aniónica)": "Electrolitos (Na, K, Cl, Brecha Aniónica)",
  "Fosfatasa Alcalina": "Fosfatasa Alcalina",
  "Fósforo": "Fósforo",
  "GGT": "Gamma Glutamil Transferasa (GGT)",
  "Glucosa": "Glucosa",
  "Lipasa": "Lipasa",
  "Proteínas Totales": "Proteínas Totales",
  "Triglicéridos": "Triglicéridos",
  "Parcial de Orina – Completo (Tirilla Urovet, Test de Héller, Relación P/C, Sedimento, Coloración Wright)":
    "Parcial de Orina – Completo (Tirilla Urovet, Test de Héller, Relación P/C, Sedimento, Coloración Wright)",
  "UPC (Proteinuria / Creatinuria)": "Relación PROTEÍNA/CREATININA Urinaria (UPC)",
  "Coprológico (Microscopía y Miniflotac)": "Coprológico (Flotación y Directo)",
  "Coproscópico (Azúcares Reductores, pH, Sangre Oculta, Grasa Fecal, Coloración Wright)": "Coproscópico",
  "Raspado de Piel": "Raspado de Piel (KOH y Ácaros)",
  "Tricograma": "Tricograma",
  "T4 Total Canina": "T4 Total Canina",
  "T4 Libre": "T4 Libre",
  "Cortisol": "Cortisol",
  "TSH Canina": "TSH Canina",
  "Lipasa Pancreática Específica Canina": "Lipasa Pancreática Específica Canina (CPL2)",
  "Lipasa Pancreática Específica Felina": "Lipasa Pancreática Específica Felina (FPL2)",
  "Supresión con Dexametasona (Cortisol AM Ayuno 12h + Cortisol PM 8h Post Medicamento)": "Prueba de Supresión con Dexametasona a Dosis Baja",
  "Distemper Canino (Moquillo)": "Distemper Canino (Moquillo) — CDV Ag",
  "Parvovirus Canino": "Parvovirus Canino — CPV Ag",
  "Inmunodeficiencia Viral Felina (VIF) Ab – Leucemia Viral Felina (VILEF) Ag": "Test FIV Ab – FeLV Ag",
  "SNAP 4DX (Ehrlichia, Anaplasma, Borrelia, Dirofilaria)": "SNAP 4DX (Ehrlichia, Anaplasma, Borrelia, Dirofilaria)",
  "Citología Conjuntival": "Citología Conjuntival",
  "Citología de Piel": "Citología de Piel",
  "Citología Ótica - 1 Oído": "Citología de Secreción Ótica (Coloración de Wright para Malassezia)",
  "Citología de Masa": "Citología de Masa (PAAF)",
  "Citología Masa Adicional o Contramuestra": "Citología de Masa Adicional o Contramuestra",
  "Citología de Líquidos (Pleura, Bronco-alveolar, Sinovial, Prostático, Vesical, LCR)":
    "Citología de Líquidos (Pleural, BRONCO-ALVEOLAR, Sinovial, Prostático, Vesical, LCR)",
  "Test de Rivalta": "Test de Rivalta",
  "Citoquímico de Líquido (Pleura, Bronco-alveolar, Sinovial, Prostático, Vesical, LCR)":
    "Estudio de Líquido (Citoquímico + Citología + Test de Rivalta)",
}

// ── Exámenes actuales que ya no están en la lista: se retiran ────────────────────────────────────
const RETIRE = [
  "Hemograma Canino 1 - 2 Meses",
  "Hemograma Canino 2.5 - 3.5 Meses",
  "Hemograma Canino 4 - 6 Meses",
  "Hemograma Completo Felino", // sus rangos felinos pasan al Hemograma Completo (uno solo, canino + felino)
  "Hemograma Sencillo Felino", // ídem, al Hemograma Simple
  "Reticulocitos", // incluido en el Hemograma Completo con Recuento de Reticulocitos
  "Pruebas Cruzadas (Compatibilidad Transfusional)",
  "Pruebas de Coagulación (PT y PTT)", // reemplazado por TPT, TP y TPT + TP
  "Proteínas Totales, Albúmina y Globulinas",
  "Gases Sanguíneos",
  "T4 Total Felina",
  "Hormonas Reproductivas (Testosterona Total, Progesterona, Estradiol)", // se separa en 3 exámenes
  "Perfil Básico Canino I",
  "Perfil Básico Canino II",
  "Perfil Básico Felino I",
  "Perfil Básico Felino II",
  "Perfil Diagnóstico",
  "Perfil Hepático",
  "Perfil Renal",
]

// ── Campos ───────────────────────────────────────────────────────────────────────────────────
type FieldDef = {
  name: string
  key: string
  unit?: string | null
  refCanine?: string | null
  refFeline?: string | null
  technique?: string | null
  fieldType: string
  calcFormula?: string | null
}
type SectionDef = { name: string; fields: FieldDef[] }

const num = (name: string, key: string, unit: string | null, refCanine: string | null = null, refFeline: string | null = null): FieldDef =>
  ({ name, key, unit, refCanine, refFeline, fieldType: "number" })
const txt = (name: string, key: string, refCanine: string | null = null, refFeline: string | null = refCanine): FieldDef =>
  ({ name, key, refCanine, refFeline, fieldType: "text" })

const antibiograma: SectionDef = {
  name: "Antibiograma",
  fields: [txt("Sensible a", "antibiograma_sensible"), txt("Intermedio a", "antibiograma_intermedio"), txt("Resistente a", "antibiograma_resistente")],
}
const pcr = (...agentes: [string, string][]): SectionDef[] => [
  { name: "Resultado PCR", fields: agentes.map(([name, key]) => txt(name, key, "No detectado")) },
]

// Nombres de campos del catálogo v6 que venían sin tilde
const FIELD_NAME_FIX: Record<string, string> = {
  "Acido Urico": "Ácido Úrico",
  "Albumina": "Albúmina",
  "Proteinas Totales": "Proteínas Totales",
  "Trigliceridos": "Triglicéridos",
  "Fosforo": "Fósforo",
  "Nitrogeno Ureico (Bun)": "Nitrógeno Ureico (BUN)",
  "Bun": "BUN",
  "Neutrofilos Seg": "Neutrófilos Seg.",
  "Eosinofilos Abs (#)": "Eosinófilos Abs (#)",
  "Eosinofilos Rel (%)": "Eosinófilos Rel (%)",
  "Basofilos": "Basófilos",
  "Hipocromia": "Hipocromía",
}

type Tx = Prisma.TransactionClient
type Loaded = Prisma.ExamTemplateGetPayload<{
  include: { sections: { include: { fields: { include: { _count: { select: { results: true } } } } } } }
}>

async function load(tx: Tx, name: string): Promise<Loaded> {
  const found = await tx.examTemplate.findMany({
    where: { name },
    include: {
      sections: { orderBy: { order: "asc" }, include: { fields: { orderBy: { order: "asc" }, include: { _count: { select: { results: true } } } } } },
    },
  })
  if (found.length !== 1) throw new Error(`Se esperaba 1 examen "${name}", hay ${found.length}`)
  return found[0]
}

const allFields = (t: Loaded) => t.sections.flatMap(s => s.fields)
function fieldOf(t: Loaded, key: string) {
  const f = allFields(t).find(f => f.key === key)
  if (!f) throw new Error(`"${t.name}" no tiene el campo ${key}`)
  return f
}

async function deleteField(tx: Tx, t: Loaded, key: string) {
  const f = fieldOf(t, key)
  if (f._count.results > 0) throw new Error(`No se borra ${t.name}.${key}: tiene ${f._count.results} resultados`)
  await tx.examField.delete({ where: { id: f.id } })
}

async function deleteSection(tx: Tx, t: Loaded, name: string) {
  const s = t.sections.find(s => s.name === name)
  if (!s) throw new Error(`"${t.name}" no tiene la sección ${name}`)
  const withResults = s.fields.filter(f => f._count.results > 0)
  if (withResults.length) throw new Error(`No se borra la sección ${t.name} / ${name}: tiene resultados`)
  await tx.examSection.delete({ where: { id: s.id } })
}

async function renameSection(tx: Tx, t: Loaded, from: string, to: string) {
  const s = t.sections.find(s => s.name === from)
  if (!s) throw new Error(`"${t.name}" no tiene la sección ${from}`)
  await tx.examSection.update({ where: { id: s.id }, data: { name: to } })
}

async function updateField(tx: Tx, t: Loaded, key: string, data: Prisma.ExamFieldUpdateInput) {
  await tx.examField.update({ where: { id: fieldOf(t, key).id }, data })
}

function sectionCreate(sections: SectionDef[], startOrder = 0) {
  return sections.map((s, si) => ({
    name: s.name,
    order: startOrder + si,
    fields: { create: s.fields.map((f, fi) => ({ ...f, order: fi })) },
  }))
}

// Copia los rangos felinos de la plantilla felina a la canina (mismo `key`), para dejar un solo examen.
// El catálogo v6 dejó el diferencial felino en la columna canina, por eso se toma el que tenga valor.
async function mergeFelineRefs(tx: Tx, canine: Loaded, feline: Loaded) {
  for (const f of allFields(canine)) {
    const fel = allFields(feline).find(x => x.key === f.key)
    if (!fel) throw new Error(`${feline.name} no tiene ${f.key}`)
    await tx.examField.update({
      where: { id: f.id },
      data: { refCanine: f.refCanine ?? f.refFeline, refFeline: fel.refFeline ?? fel.refCanine },
    })
  }
}

// ── Cambios de campos en los exámenes que siguen ────────────────────────────────────────────────
async function reconcileExisting(tx: Tx) {
  // Hemograma: un solo examen con rangos canino y felino
  let t = await load(tx, "Hemograma Sencillo Canino")
  await mergeFelineRefs(tx, t, await load(tx, "Hemograma Sencillo Felino"))
  await renameSection(tx, t, "Hemograma Canino", "Hemograma")
  await updateField(tx, t, "solidos_totales", { name: "Proteínas Plasmáticas (Sólidos Totales)" })

  t = await load(tx, "Hemograma Completo Canino")
  await mergeFelineRefs(tx, t, await load(tx, "Hemograma Completo Felino"))

  // Hemoparásitos = frotis extendido + gota gruesa
  t = await load(tx, "Hemopárasitos")
  await deleteField(tx, t, "capilar")
  await updateField(tx, t, "extendido_de_sangre_periferica", { name: "Frotis Extendido", order: 0 })
  await updateField(tx, t, "gota_gruesa", { order: 1 })

  // Electrolitos: Na, K, Cl y brecha aniónica (el bicarbonato ahora es un examen aparte; la brecha se digita)
  t = await load(tx, "Electrolitos (Na, K, Cl, Brecha Aniónica)")
  await deleteField(tx, t, "bicarbonato_co2")
  await updateField(tx, t, "brecha_anionica_anion_gap", { fieldType: "number", calcFormula: null })

  // Coprológico: se agrega la flotación Mini-FLOTAC
  t = await load(tx, "Coprológico (Flotación y Directo)")
  await tx.examSection.create({
    data: {
      templateId: t.id,
      ...sectionCreate([{ name: "Flotación (Mini-FLOTAC)", fields: [
        txt("Parásitos Identificados", "miniflotac_parasitos"),
        txt("Recuento (Huevos / Ooquistes por Gramo)", "miniflotac_recuento"),
      ] }], t.sections.length)[0],
    },
  })

  // Coproscópico: azúcares reductores, pH, sangre oculta, grasa fecal, coloración Wright
  t = await load(tx, "Coproscópico")
  await deleteField(tx, t, "almidones_lugol")
  await updateField(tx, t, "tincion_wright_gram", { name: "Coloración de Wright", refCanine: null, refFeline: null })
  await tx.examField.create({
    data: { sectionId: fieldOf(t, "ph_fecal").sectionId, order: -1, ...txt("Azúcares Reductores", "azucares_reductores", "Negativo") },
  })

  // Raspado de piel: el tricograma es un examen aparte
  t = await load(tx, "Raspado de Piel (KOH y Ácaros)")
  await deleteSection(tx, t, "Tricograma")

  // Supresión con dexametasona: cortisol AM (basal, ayuno 12 h) + cortisol PM (8 h post)
  t = await load(tx, "Prueba de Supresión con Dexametasona a Dosis Baja")
  await deleteField(tx, t, "cortisol_post_dexametasona_4_horas")
  await updateField(tx, t, "cortisol_basal", { name: "Cortisol AM (Basal, Ayuno 12 h)" })
  await updateField(tx, t, "cortisol_post_dexametasona_8_horas", { name: "Cortisol PM (8 h Post Dexametasona)" })

  // Lipasas pancreáticas: la sección decía "Química Sanguínea"
  for (const name of ["Lipasa Pancreática Específica Canina (CPL2)", "Lipasa Pancreática Específica Felina (FPL2)"]) {
    t = await load(tx, name)
    await renameSection(tx, t, "Química Sanguínea", "Lipasa Pancreática Específica")
  }

  // Test rápidos caninos: la sección decía "Test Rápido FIV / FeLV" y el "Negativo" estaba en la columna felina
  t = await load(tx, "Distemper Canino (Moquillo) — CDV Ag")
  await renameSection(tx, t, "Test Rápido FIV / FeLV", "Test Rápido Distemper Canino (CDV Ag)")
  await updateField(tx, t, "virus_distemper_canino_cdv_antigeno", { refCanine: "Negativo", refFeline: null })
  t = await load(tx, "Parvovirus Canino — CPV Ag")
  await renameSection(tx, t, "Test Rápido FIV / FeLV", "Test Rápido Parvovirus Canino (CPV Ag)")
  await updateField(tx, t, "virus_parvovirus_canino_cpv_antigeno", { refCanine: "Negativo", refFeline: null })
  t = await load(tx, "Test FIV Ab – FeLV Ag")
  await renameSection(tx, t, "Test FIV Ab + FeLV Ag", "Test VIF Ab + VILEF Ag")
  for (const key of ["vif_ab_virus_de_inmunodeficiencia_felina", "felv_ag_virus_de_leucemia_felina"]) {
    await updateField(tx, t, key, { refCanine: null, refFeline: "Negativo" })
  }

  // Citología de líquidos: tenía solo la conclusión; se agrega la evaluación citológica
  t = await load(tx, "Citología de Líquidos (Pleural, BRONCO-ALVEOLAR, Sinovial, Prostático, Vesical, LCR)")
  for (const s of t.sections) await tx.examSection.update({ where: { id: s.id }, data: { order: s.order + 1 } })
  await tx.examSection.create({
    data: {
      templateId: t.id,
      ...sectionCreate([{ name: "Evaluación Citológica", fields: [
        txt("Tipo de Líquido", "tipo_de_liquido"),
        txt("Celularidad", "celularidad"),
        txt("Población Celular Predominante", "poblacion_celular_predominante"),
      ] }])[0],
    },
  })
}

// ── Exámenes nuevos (no perfiles) — se arma con los nombres y campos actuales, antes de cambiarlos ────────────────────────────────────────────────────────────────
async function newExamSections(tx: Tx): Promise<Record<string, SectionDef[]>> {
  const coag = await load(tx, "Tiempo de Tromboplastina - Tiempo de Protrombina (TPT + TP)")
  const copy = (t: Loaded, key: string): FieldDef => {
    const f = fieldOf(t, key)
    return { name: f.name, key: f.key!, unit: f.unit, refCanine: f.refCanine, refFeline: f.refFeline, technique: f.technique, fieldType: f.fieldType, calcFormula: f.calcFormula }
  }
  const electrolitos = await load(tx, "Electrolitos (Na, K, Cl, Brecha Aniónica)")
  const bili = await load(tx, "Bilirrubina Total y Directa")
  const upc = await load(tx, "Relación PROTEÍNA/CREATININA Urinaria (UPC)")
  const hormonas = await load(tx, "Hormonas Reproductivas (Testosterona Total, Progesterona, Estradiol)")
  const otica = await load(tx, "Citología de Secreción Ótica (Coloración de Wright para Malassezia)")
  const oticaRecuento = otica.sections[0]
  const oticaInterp = otica.sections[1]
  const oido = (lado: string, suf: string): SectionDef => ({
    name: `Oído ${lado} — ${oticaRecuento.name}`,
    fields: oticaRecuento.fields.map(f => ({ ...copy(otica, f.key!), key: `${f.key}_${suf}` })),
  })

  return {
    "Extendido de Sangre Periférica": [
      { name: "Extendido de Sangre Periférica", fields: [
        txt("Línea Roja", "linea_roja"), txt("Línea Blanca", "linea_blanca"),
        txt("Serie Plaquetaria", "serie_plaquetaria"), txt("Hemoparásitos", "hemoparasitos"),
      ] },
      { name: "Conclusión", fields: [txt("Interpretación", "interpretacion")] },
    ],
    "Tiempo de Tromboplastina (TPT)": [{ name: "Pruebas de Coagulación", fields: [copy(coag, "tiempo_de_tromboplastina_ptt_aptt")] }],
    "Tiempo de Protrombina (TP)": [{ name: "Pruebas de Coagulación", fields: [copy(coag, "tiempo_de_protrombina_pt")] }],

    "Bicarbonato": [{ name: "Bioquímica Sanguínea", fields: [{ ...copy(electrolitos, "bicarbonato_co2"), name: "Bicarbonato (HCO3)" }] }],
    "Bilirrubina Directa": [{ name: "Bioquímica Sanguínea", fields: [copy(bili, "bilirrubina_directa")] }],
    "Bilirrubina Total": [{ name: "Bioquímica Sanguínea", fields: [copy(bili, "bilirrubina_total")] }],
    "Cloro": [{ name: "Bioquímica Sanguínea", fields: [copy(electrolitos, "cloro_cl")] }],
    "CK (Creatin Fosfoquinasa)": [{ name: "Bioquímica Sanguínea", fields: [num("CK (Creatin Fosfoquinasa)", "ck", "UI/L")] }],
    "Fructosamina": [{ name: "Bioquímica Sanguínea", fields: [num("Fructosamina", "fructosamina", "µmol/L")] }],
    "Ácidos Biliares": [{ name: "Bioquímica Sanguínea", fields: [
      num("Ácidos Biliares", "acidos_biliares", "µmol/L"),
      txt("Condición de la Muestra (Ayuno / Posprandial)", "acidos_biliares_condicion"),
    ] }],

    "Creatininuria": [{ name: "Química Urinaria", fields: [copy(upc, "creatinuria_creatinina_en_orina")] }],
    "Sangre Oculta en Heces": [{ name: "Coproscópico", fields: [txt("Sangre Oculta", "sangre_oculta", "Negativo")] }],

    "Testosterona Total": [{ name: "Hormonas Reproductivas", fields: [copy(hormonas, "testosterona")] }],
    "Progesterona": [{ name: "Hormonas Reproductivas", fields: [copy(hormonas, "progesterona")] }],
    "Estradiol": [{ name: "Hormonas Reproductivas", fields: [copy(hormonas, "estradiol")] }],

    "Cultivo de Secreciones con Antibiograma (Oídos, Tejidos, Exudados, Secreciones)": [
      { name: "Cultivo Bacteriológico", fields: [
        txt("Sitio / Tipo de Muestra", "sitio_muestra"), txt("Coloración de Gram", "coloracion_gram"),
        txt("Crecimiento Bacteriano", "crecimiento"), txt("Microorganismo(s) Aislado(s)", "microorganismo_aislado"),
      ] },
      antibiograma,
    ],
    "Cultivo para Hongos": [
      { name: "Cultivo Micológico", fields: [
        txt("Sitio / Tipo de Muestra", "sitio_muestra"), txt("Examen Directo (KOH)", "examen_directo_koh"),
        txt("Crecimiento", "crecimiento"), txt("Hongo Aislado (Género / Especie)", "hongo_aislado"),
        txt("Características de la Colonia", "caracteristicas_colonia"),
      ] },
    ],
    "Urocultivo y Antibiograma": [
      { name: "Urocultivo", fields: [
        txt("Método de Recolección", "metodo_de_recoleccion"),
        num("Recuento de Colonias", "recuento_colonias", "UFC/mL"),
        txt("Microorganismo(s) Aislado(s)", "microorganismo_aislado"),
      ] },
      antibiograma,
    ],

    "Anticuerpos Rábicos (Incluye Resultado Original)": [
      { name: "Serología Rábica", fields: [
        num("Título de Anticuerpos Neutralizantes", "titulo_anticuerpos_rabia", "UI/mL", "Mínimo 0.5", "Mínimo 0.5"),
        txt("Técnica", "tecnica"), txt("Laboratorio de Referencia", "laboratorio_referencia"),
      ] },
    ],

    "Citología Ótica - 2 Oídos": [
      oido("Derecho", "od"),
      oido("Izquierdo", "oi"),
      { name: oticaInterp.name, fields: oticaInterp.fields.map(f => copy(otica, f.key!)) },
    ],
    "Coloración para Malassezia (Wright)": [
      { name: "Coloración de Wright", fields: [
        txt("Sitio de Muestra", "sitio_muestra"),
        { ...copy(otica, "levaduras_malassezia_spp"), name: "Levaduras (Malassezia spp) por Campo 100x" },
        txt("Interpretación", "interpretacion"),
      ] },
    ],
    "Histopatología (Hasta 3 Muestras o Masa)": [
      { name: "Histopatología", fields: [
        txt("Número y Tipo de Muestras", "muestras"), txt("Descripción Macroscópica", "descripcion_macroscopica"),
        txt("Descripción Microscópica", "descripcion_microscopica"), txt("Diagnóstico Morfológico", "diagnostico_morfologico"),
        txt("Márgenes Quirúrgicos", "margenes"), txt("Comentario", "comentario"),
      ] },
    ],
    "Suero Autólogo": [
      { name: "Preparación", fields: [
        num("Volumen Obtenido", "volumen_obtenido", "mL"), txt("Fecha de Preparación", "fecha_preparacion"),
        txt("Fecha de Vencimiento", "fecha_vencimiento"), txt("Condiciones de Conservación", "conservacion"),
      ] },
    ],

    "PCR Cualitativa Hemoparásitos Canino (Ehrlichia, Anaplasma, Hepatozoon, Babesia sp.)": pcr(
      ["Ehrlichia spp.", "pcr_ehrlichia"], ["Anaplasma spp.", "pcr_anaplasma"], ["Hepatozoon spp.", "pcr_hepatozoon"], ["Babesia spp.", "pcr_babesia"]),
    "PCR Cualitativa Parvovirus Canino": pcr(["Parvovirus Canino (CPV)", "pcr_parvovirus"]),
    "PCR Cualitativa Distemper Canino": pcr(["Distemper Canino (CDV)", "pcr_distemper"]),
    "PCR Cualitativa Parvovirus + Distemper Canino": pcr(["Parvovirus Canino (CPV)", "pcr_parvovirus"], ["Distemper Canino (CDV)", "pcr_distemper"]),
    "PCR Cualitativa Dirofilaria immitis": pcr(["Dirofilaria immitis", "pcr_dirofilaria"]),
    "PCR Cualitativa Perfil Hemoparásitos Felino (Anaplasma, Cytauxzoon, Mycoplasma, Bartonella sp.)": pcr(
      ["Anaplasma spp.", "pcr_anaplasma"], ["Cytauxzoon spp.", "pcr_cytauxzoon"], ["Mycoplasma spp.", "pcr_mycoplasma"], ["Bartonella spp.", "pcr_bartonella"]),
    "PCR Cualitativa Perfil Viral Felino (Leucemia Viral, Inmunodeficiencia Viral, Mycoplasma, Bartonella)": pcr(
      ["Leucemia Viral Felina (FeLV)", "pcr_felv"], ["Inmunodeficiencia Viral Felina (FIV)", "pcr_fiv"],
      ["Mycoplasma spp.", "pcr_mycoplasma"], ["Bartonella spp.", "pcr_bartonella"]),
    "PCR Cualitativa Inmunodeficiencia Viral Felina": pcr(["Inmunodeficiencia Viral Felina (FIV)", "pcr_fiv"]),
    "PCR Cualitativa Leucemia Viral Felina": pcr(["Leucemia Viral Felina (FeLV)", "pcr_felv"]),
    "Perfil Infeccioso Felino Cualitativo (PCR)": pcr(
      ["Leucemia Viral Felina (FeLV)", "pcr_felv"], ["Inmunodeficiencia Viral Felina (FIV)", "pcr_fiv"],
      ["Mycoplasma spp.", "pcr_mycoplasma"], ["Bartonella spp.", "pcr_bartonella"],
      ["Coronavirus Felino Mutante (PIF)", "pcr_coronavirus_mutante"], ["Coronavirus Felino Entérico", "pcr_coronavirus_enterico"]),
  }
}

// ── Perfiles: se arman con los campos de sus exámenes componentes ────────────────────────────────
async function profileComponents(tx: Tx): Promise<Record<string, ComposeComponent[]>> {
  const byName = async (name: string) => load(tx, name)
  const whole = async (label: string, name: string): Promise<ComposeComponent> => {
    const t = await byName(name)
    return { name: label, sections: t.sections.map(s => ({ name: s.name, fields: s.fields })) }
  }

  // Química: todos los analitos del perfil en una sola sección, en el orden de la lista
  const ANALITOS: Record<string, [string, string[]]> = {
    ALT: ["ALT / GPT", ["alt_gpt"]],
    AST: ["AST / GOT", ["ast_got"]],
    CREA: ["Creatinina", ["creatinina"]],
    BUN: ["BUN / Nitrógeno Ureico", ["nitrogeno_ureico_bun", "urea"]],
    GLU: ["Glucosa", ["glucosa"]],
    PT: ["Proteínas Totales", ["proteinas_totales"]],
    ALB: ["Albúmina", ["albumina"]],
    GLOB: ["Proteínas Totales, Albúmina y Globulinas", ["globulinas"]], // globulinas = PT − albúmina (calculado)
    CA: ["Calcio", ["calcio"]],
    FA: ["Fosfatasa Alcalina", ["fosfatasa_alcalina_alkp"]],
    GGT: ["GGT", ["ggt"]],
    P: ["Fósforo", ["fosforo"]],
    COL: ["Colesterol", ["colesterol"]],
    TRI: ["Triglicéridos", ["trigliceridos"]],
    BILI: ["Bilirrubinas Diferenciadas (BT + BD + BI)", ["bilirrubina_total", "bilirrubina_directa", "bilirrubina_indirecta"]],
    CK: ["CK (Creatin Fosfoquinasa)", ["ck"]],
    FRUC: ["Fructosamina", ["fructosamina"]],
  }
  const quimica = async (...codes: (keyof typeof ANALITOS)[]): Promise<ComposeComponent> => {
    const fields = []
    for (const code of codes) {
      const [name, keys] = ANALITOS[code]
      const t = await byName(name)
      for (const k of keys) fields.push(fieldOf(t, k))
    }
    return { name: "Química Sanguínea", sections: [{ name: "Química Sanguínea", fields: fields.map((f, i) => ({ ...f, order: i })) }] }
  }

  const tpt = await load(tx, "Tiempo de Tromboplastina - Tiempo de Protrombina (TPT + TP)")
  const coagulacion: ComposeComponent = {
    name: "Pruebas de Coagulación",
    sections: [{ name: "Pruebas de Coagulación", fields: [fieldOf(tpt, "tiempo_de_protrombina_pt"), fieldOf(tpt, "tiempo_de_tromboplastina_ptt_aptt")].map((f, i) => ({ ...f, order: i })) }],
  }
  const gram: ComposeComponent = {
    name: "Coloración de Gram",
    sections: [{ name: "Coloración de Gram", fields: [
      txt("Bacterias Gram Positivas", "gram_positivas"), txt("Bacterias Gram Negativas", "gram_negativas"),
      txt("Levaduras", "gram_levaduras"), txt("Interpretación", "gram_interpretacion"),
    ].map((f, i) => ({ ...f, unit: null, technique: null, calcFormula: null, order: i })) }],
  }

  const HEMO = () => whole("Hemograma", "Hemograma Simple / Proteínas Plasmáticas")
  const HPAR = () => whole("Hemoparásitos", "Hemoparásitos (Frotis Extendido y Gota Gruesa)")
  const COPRO = () => whole("Coprológico", "Coprológico (Microscopía y Miniflotac)")
  const ORINA = () => whole("Parcial de Orina", "Parcial de Orina – Completo (Tirilla Urovet, Test de Héller, Relación P/C, Sedimento, Coloración Wright)")

  return {
    "Perfil Pre-quirúrgico 1": [await HEMO(), await quimica("ALT", "CREA", "FA")],
    "Perfil Pre-quirúrgico 2": [await HEMO(), await quimica("ALT", "CREA", "BUN", "FA")],
    "Perfil Pre-quirúrgico 3": [await HEMO(), await quimica("ALT", "BUN", "CREA", "GLU", "ALB", "PT", "FA")],
    "Perfil Profilaxis Canino": [await HEMO(), await HPAR(), await quimica("ALT", "CREA")],
    "Perfil Profilaxis Felino": [await HEMO(), await HPAR(), await quimica("GGT", "CREA")],
    "Perfil Básico Canino": [await HEMO(), await quimica("ALT", "CREA", "BUN", "GLU", "PT", "ALB", "GLOB", "CA", "FA")],
    "Perfil Básico Felino": [await HEMO(), await quimica("ALT", "CREA", "BUN", "GLU", "PT", "ALB", "GLOB", "CA", "GGT")],
    "Perfil Pre-quirúrgico 4": [await HEMO(), await quimica("ALT", "CREA", "BUN", "FA"), coagulacion],
    "Perfil Felino Viral": [await HEMO(), await HPAR(), await quimica("ALT", "CREA"),
      await whole("Test VIF / VILEF", "Inmunodeficiencia Viral Felina (VIF) Ab – Leucemia Viral Felina (VILEF) Ag")],
    "Perfil Canino Distemper": [await HEMO(), await HPAR(), await quimica("ALT", "CREA"),
      await whole("Test Distemper", "Distemper Canino (Moquillo)")],
    "Perfil Canino Parvo": [await HEMO(), await HPAR(), await quimica("ALT", "CREA"), await COPRO(),
      await whole("Test Parvovirus", "Parvovirus Canino")],
    "Perfil Hepático Canino": [await HEMO(), await quimica("ALT", "FA", "BILI", "COL")],
    "Perfil Hepático Felino": [await HEMO(), await quimica("AST", "GGT", "BILI", "COL")],
    "Perfil Renal Sencillo": [await HEMO(), await quimica("CREA", "BUN")],
    "Perfil Renal Completo": [await HEMO(), await quimica("CREA", "BUN", "P", "ALB"), await ORINA(),
      await whole("UPC", "UPC (Proteinuria / Creatinuria)")],
    "Perfil Dermatológico Sencillo": [await whole("Raspado de Piel", "Raspado de Piel"), await whole("Tricograma", "Tricograma")],
    "Perfil Dermatológico Sencillo 2": [await whole("Raspado de Piel", "Raspado de Piel"), await whole("Tricograma", "Tricograma"), gram],
    "Perfil Dermatológico Completo": [await HEMO(), await whole("Cultivo para Hongos", "Cultivo para Hongos"),
      await whole("Citología de Piel", "Citología de Piel")],
    "Perfil Diabético": [await HEMO(), await quimica("GLU", "FRUC"), await ORINA()],
    "Perfil Geriátrico": [await HEMO(), await HPAR(), await quimica("ALT", "FA", "CREA", "BUN", "COL", "GLU"), await ORINA(), await COPRO()],
    "Perfil Integral": [await HEMO(), await HPAR(),
      await quimica("ALT", "CREA", "BUN", "FA", "PT", "ALB", "GLOB", "CA", "P", "COL", "TRI", "GLU", "BILI", "CK"),
      await COPRO(), await ORINA()],
  }
}

// ── Ejecución ────────────────────────────────────────────────────────────────────────────────
class DryRun extends Error {}

async function run(tx: Tx) {
  const listNames = new Set(LIST.map(i => i.name))
  if (listNames.size !== LIST.length) throw new Error("Nombres repetidos en la lista")
  console.log(`Lista v3: ${LIST.length} exámenes`)

  // 0. Los exámenes nuevos copian campos de los actuales: se arman antes de modificarlos
  const nuevos = await newExamSections(tx)

  // 1. Cambios de campos (sobre los nombres actuales)
  await reconcileExisting(tx)

  // 2. Datos comerciales + nombre nuevo de los que siguen
  for (const [newName, oldName] of Object.entries(KEEP)) {
    const item = LIST.find(i => i.name === newName)
    if (!item) throw new Error(`KEEP apunta a "${newName}", que no está en la lista`)
    const t = await load(tx, oldName)
    await tx.examTemplate.update({
      where: { id: t.id },
      data: { name: item.name, area: item.area, sampleType: item.sample, turnaround: item.turnaround, price: item.price, description: item.includes ?? null, active: true },
    })
  }
  console.log(`Actualizados: ${Object.keys(KEEP).length}`)

  // 3. Retirar los que ya no están
  for (const name of RETIRE) {
    const t = await load(tx, name)
    await tx.examTemplate.update({ where: { id: t.id }, data: { active: false } })
  }
  console.log(`Retirados: ${RETIRE.length}`)

  // 4. Tildes en nombres de campos de los exámenes activos
  for (const [from, to] of Object.entries(FIELD_NAME_FIX)) {
    await tx.examField.updateMany({ where: { name: from, section: { template: { active: true } } }, data: { name: to } })
  }

  // 5. Exámenes nuevos
  for (const [name, sections] of Object.entries(nuevos)) {
    const item = LIST.find(i => i.name === name)
    if (!item) throw new Error(`Examen nuevo "${name}" no está en la lista`)
    await tx.examTemplate.create({
      data: {
        name, area: item.area, sampleType: item.sample, turnaround: item.turnaround, price: item.price,
        description: item.includes ?? null, sections: { create: sectionCreate(sections) },
      },
    })
  }
  console.log(`Nuevos: ${Object.keys(nuevos).length}`)

  // 6. Perfiles
  const perfiles = await profileComponents(tx)
  for (const [name, components] of Object.entries(perfiles)) {
    const item = LIST.find(i => i.name === name)
    if (!item) throw new Error(`Perfil "${name}" no está en la lista`)
    await tx.examTemplate.create({
      data: {
        name, area: item.area, sampleType: item.sample, turnaround: item.turnaround, price: item.price,
        description: item.includes ?? null, sections: { create: composeSections(components) },
      },
    })
  }
  console.log(`Perfiles: ${Object.keys(perfiles).length}`)

  // 7. Verificación
  const active = await tx.examTemplate.findMany({
    where: { active: true, isPromotion: false },
    include: { sections: { orderBy: { order: "asc" }, include: { fields: { orderBy: { order: "asc" } } } } },
    orderBy: [{ area: "asc" }, { name: "asc" }],
  })
  const activeNames = new Set(active.map(t => t.name))
  const missing = LIST.filter(i => !activeNames.has(i.name)).map(i => i.name)
  const extra = active.filter(t => !listNames.has(t.name)).map(t => t.name)
  if (missing.length || extra.length || active.length !== LIST.length) {
    throw new Error(`Catálogo no cuadra con la lista. Faltan: ${missing.join(" | ")}. Sobran: ${extra.join(" | ")}`)
  }
  for (const t of active) {
    const item = LIST.find(i => i.name === t.name)!
    if (t.price !== item.price || t.area !== item.area || t.sampleType !== item.sample || t.turnaround !== item.turnaround) {
      throw new Error(`Datos comerciales no cuadran en ${t.name}`)
    }
    const fields = t.sections.flatMap(s => s.fields)
    if (fields.length === 0) throw new Error(`${t.name} quedó sin campos`)
    const keys = new Set(fields.map(f => f.key))
    if (keys.size !== fields.length) throw new Error(`${t.name} tiene keys repetidos`)
    for (const f of fields) {
      if (f.fieldType !== "calculated" || !f.calcFormula) continue
      for (const m of f.calcFormula.matchAll(/[a-z_][a-z0-9_]*/g)) {
        if (!keys.has(m[0])) throw new Error(`${t.name}: la fórmula de ${f.name} usa ${m[0]}, que no existe`)
      }
    }
  }
  console.log(`\n✓ ${active.length} exámenes activos = lista v3 (nombres, área, muestra, entrega y precio cuadran; fórmulas resuelven)\n`)

  for (const t of active.filter(t => t.area === PER || t.name.startsWith("Perfil Infeccioso"))) {
    console.log(`${t.name} — $${t.price?.toLocaleString("es-CO") ?? "A DEFINIR"}`)
    for (const s of t.sections) {
      console.log(`   · ${s.name}: ${s.fields.map(f => f.name + (f.fieldType === "calculated" ? "*" : "")).join(", ")}`)
    }
  }

  if (!APPLY) throw new DryRun()
}

async function main() {
  try {
    await prisma.$transaction(run, { timeout: 600_000, maxWait: 30_000 })
    console.log("\nAPLICADO.")
  } catch (e) {
    if (e instanceof DryRun) console.log("\nEnsayo OK — no se guardó nada (usar --apply para aplicar).")
    else throw e
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
