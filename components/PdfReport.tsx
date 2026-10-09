import { Fragment } from "react"
import { RANGE_COLORS, getRangeStatus, refForSpecies } from "@/lib/rangeStatus"
import path from "path"
import fs from "fs"
import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from "@react-pdf/renderer"
import type { Style } from "@react-pdf/types"
import { isDescriptiveSection } from "@/lib/sections"
import { referenceTableFor } from "@/lib/referenceTables"
import { SITE } from "@/lib/site-config"
import {
  colorLabel, coproPhotoRole, gramPhrase, isCoproSection, isCoproscopicoSection, NOTA_FIJA, parseMarkup, phLabel, readCoproAt, readCoproscopico,
  stripMarkup, TECNICA_DEFAULT, type CoproData, type CoproscopicoData, type Segment,
} from "@/lib/coprologico"
import {
  colorOrinaLabel, densidadLabel, isAbnormal, isOrinaSection, LEYENDA_BACTERIAS, METODOS_DEFAULT, NOTA_ORINA,
  ORINA_CONFIG_DEFAULT, PARAM_LABEL, phOrinaLabel, readOrina, speciesKey, upcInterpretacion, upcValue,
  type CatParam, type NumParam, type OrinaConfig, type OrinaData,
} from "@/lib/orina"

const logoBuffer = fs.readFileSync(path.join(process.cwd(), "public", "logos", "pets-lab-cream.png"))
const LOGO = `data:image/png;base64,${logoBuffer.toString("base64")}`
// Sin división de palabras con guion: react-pdf usa reglas del inglés ("compat-ibles", "Cor-regido")
Font.registerHyphenationCallback(word => [word])

const SIGNATURE = `data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), "public", "firma-marcelo-valencia.png")).toString("base64")}`
const SIGNATURE_ANDERSON = `data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), "public", "firma-anderson-angulo.png")).toString("base64")}`

// Colors
const C = {
  salvia700: "#3a4a3f",
  salvia50: "#f2f5f2",
  bone: "#faf6ee",
  ink: "#1a1a18",
  ink2: "#4a4a44",
  red: "#b91c1c",
  borderLight: "#e4ebe4",
}

const styles = StyleSheet.create({
  // paddingBottom reserva el espacio del pie fijo (si no, las filas quedan debajo del pie y el
  // relleno inferior del cuerpo puede pasar solo a una página en blanco)
  page: { backgroundColor: C.bone, padding: 0, paddingTop: 71, paddingBottom: 54, fontFamily: "Helvetica" },
  header: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: C.salvia700, paddingHorizontal: 32, paddingVertical: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerLogo: { width: 90, height: 35, objectFit: "contain" },
  headerRight: { alignItems: "flex-end" },
  headerTitle: { color: C.bone, fontSize: 7, letterSpacing: 2, textTransform: "uppercase" },
  headerMono: { color: "#a3b8a4", fontSize: 6, letterSpacing: 2, marginTop: 2 },
  body: { paddingHorizontal: 32, paddingTop: 20 },

  // Patient bar
  patientBar: { backgroundColor: C.salvia50, borderLeftWidth: 3, borderLeftColor: C.salvia700, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  patientLabel: { fontSize: 6, color: C.ink2, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 2 },
  patientValue: { fontSize: 9, color: C.ink, fontFamily: "Helvetica-Bold" },

  // Exam block
  examBlock: { marginBottom: 18 },
  examHeader: { backgroundColor: C.salvia700, paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", justifyContent: "space-between" },
  examTitle: { color: C.bone, fontSize: 9, fontFamily: "Helvetica-Bold" },
  examArea: { color: "#a3b8a4", fontSize: 7, letterSpacing: 1.5, textTransform: "uppercase" },

  sectionLabel: { fontSize: 6.5, color: C.ink2, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 8, marginBottom: 4, paddingBottom: 2, borderBottomWidth: 0.5, borderBottomColor: C.borderLight },

  tableHead: { flexDirection: "row", backgroundColor: C.salvia50, paddingHorizontal: 8, paddingVertical: 4 },
  tableRow: { flexDirection: "row", paddingHorizontal: 8, paddingVertical: 3.5, borderBottomWidth: 0.5, borderBottomColor: C.borderLight },
  tableRowAlt: { backgroundColor: "#f8faf8" },
  tableRowLow: { backgroundColor: "#eff5ff" },
  tableRowHigh: { backgroundColor: "#fff5f5" },

  colParam: { flex: 2.5 },
  colUnit: { flex: 0.8 },
  colResult: { flex: 0.9 },
  colRef: { flex: 1.5 },
  colTech: { flex: 2 },
  colDesc: { flex: 6.7 },
  // Filas de "Morfología y observaciones": texto libre, más altas para que la descripción respire
  descRow: { flexDirection: "row", paddingHorizontal: 8, paddingVertical: 7, minHeight: 30, borderBottomWidth: 0.5, borderBottomColor: C.borderLight },
  descText: { fontSize: 8, color: C.ink, lineHeight: 1.4 },

  thText: { fontSize: 6, color: C.ink2, letterSpacing: 1.2, textTransform: "uppercase" },
  tdText: { fontSize: 8, color: C.ink },
  tdMono: { fontSize: 7.5, color: C.ink2 },
  tdLow: { fontSize: 8, color: RANGE_COLORS.low, fontFamily: "Helvetica-Bold" },
  tdHigh: { fontSize: 8, color: RANGE_COLORS.high, fontFamily: "Helvetica-Bold" },

  // Footer
  footer: { position: "absolute", bottom: 18, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", borderTopWidth: 0.5, borderTopColor: C.borderLight, paddingTop: 8 },
  footerText: { fontSize: 6.5, color: C.ink2, letterSpacing: 1 },
  footerBold: { fontFamily: "Helvetica-Bold", color: C.salvia700 },

  attachedNote: { fontSize: 8, color: C.ink2, marginTop: 8, fontFamily: "Helvetica-Oblique" },
  notesLabel: { fontSize: 6.5, color: C.ink2, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 10, marginBottom: 4 },
  notesText: { fontSize: 8.5, color: C.ink, lineHeight: 1.4 },
  photoGrid: { flexDirection: "row", marginTop: 6 },
  // Marco de tamaño fijo: la foto se ajusta adentro sin deformarse (si el Image define su propio tamaño,
  // react-pdf mide la foto original y empuja el examen entero a la hoja siguiente)
  photoFrame: { width: 250, height: 188, marginRight: 10, marginBottom: 10, backgroundColor: C.salvia50, alignItems: "center", justifyContent: "center" },
  photo: { maxWidth: 250, maxHeight: 188, objectFit: "contain" },

  signBlock: { marginTop: 24, paddingTop: 16, borderTopWidth: 0.5, borderTopColor: C.borderLight, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  signText: { flex: 1 },
  signSignature: { width: 170, alignItems: "center" },
  signImage: { width: 110, height: 92, objectFit: "contain", marginBottom: -6 },
  signBlock2: { marginTop: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  signImageWide: { width: 140, height: 44, objectFit: "contain", marginBottom: 2 },
  signLine: { width: 160, borderBottomWidth: 0.5, borderBottomColor: C.ink2 },
  signName: { fontSize: 9, color: C.ink, fontFamily: "Helvetica-Bold", marginTop: 3, marginBottom: 2 },
  signRole: { fontSize: 6.5, color: C.salvia700, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "Helvetica-Bold" },
  signDetail: { fontSize: 7.5, color: C.ink2, lineHeight: 1.4 },
})

export type OrderData = {
  orderNumber: string
  patientName: string
  species: string
  breed?: string | null
  age?: string | null
  sex?: string | null
  ownerName?: string | null
  requestingVet?: string | null
  createdAt: Date
  clinic?: { name: string } | null
  branch?: { name: string; address: string } | null
  processedBy?: { name: string } | null
  orinaConfig?: OrinaConfig // valores de referencia del Parcial de Orina (LabSetting)
  exams: {
    id: string
    template: {
      name: string
      area: string
      sections: {
        id: string
        name: string
        fields: {
          id: string
          name: string
          unit?: string | null
          refCanine?: string | null
          refFeline?: string | null
          technique?: string | null
          fieldType: string
        }[]
      }[]
    }
    results: { fieldId: string; value: string; flagged: boolean }[]
    comments?: string | null
    photos?: { id: string; src: string }[] // src: data URI JPEG
    structured?: unknown // bloques con formulario propio (Coprológico)
    macroPhotos?: Record<string, string> // data URI de la foto de la muestra del Coprológico, por role (COPRO_MACRO, COPRO_MACRO_2…)
    attachedPdf?: boolean // el resultado es un PDF subido (va en las páginas siguientes)
    extraPdf?: boolean // tiene resultados capturados y además un PDF subido (va en las páginas siguientes)
  }[]
}

// ── Coprológico (resultado estructurado, ver lib/coprologico.ts) ───────────────────────────────
const copro = StyleSheet.create({
  block: { marginTop: 8 },
  title: { fontSize: 6.5, color: C.ink2, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4, paddingBottom: 2, borderBottomWidth: 0.5, borderBottomColor: C.borderLight },
  macro: { flexDirection: "row", alignItems: "flex-start" },
  rows: { flex: 1 },
  row: { flexDirection: "row", paddingVertical: 3, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: C.borderLight },
  label: { width: 120, fontSize: 7.5, color: C.ink2 },
  value: { flex: 1, fontSize: 8, color: C.ink },
  // ~3.5 cm de diámetro
  photo: { width: 99, height: 99, borderRadius: 49.5, objectFit: "cover", marginLeft: 16 },
  paragraph: { fontSize: 8.5, color: C.ink, lineHeight: 1.45, textAlign: "justify", paddingHorizontal: 8 },
  plain: { fontSize: 8, color: C.ink, paddingHorizontal: 8 },
  note: { fontSize: 7, color: C.ink2, fontFamily: "Helvetica-Oblique", paddingHorizontal: 8, marginTop: 3 },
  // Tablas de 2 columnas del Coproscópico (filas más altas)
  pairRow: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.borderLight },
  cell: { flex: 1, paddingHorizontal: 8, paddingVertical: 6, minHeight: 30 },
  cellLeft: { borderRightWidth: 0.5, borderRightColor: C.borderLight },
  cellLabel: { fontSize: 6, color: C.ink2, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 2 },
  cellValue: { fontSize: 8.5, color: C.ink, lineHeight: 1.35 },
})

const segmentFont = (s: Segment) =>
  s.bold && s.italic ? "Helvetica-BoldOblique" : s.bold ? "Helvetica-Bold" : s.italic ? "Helvetica-Oblique" : undefined

function RichText({ text, style }: { text: string; style: Style }) {
  return (
    <Text style={style}>
      {parseMarkup(text).map((s, i) => (
        <Text key={i} style={segmentFont(s) ? { fontFamily: segmentFont(s) } : {}}>{s.text}</Text>
      ))}
    </Text>
  )
}

function CoproRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={copro.row}>
      <Text style={copro.label}>{label}</Text>
      <RichText text={value || "—"} style={copro.value} />
    </View>
  )
}

function PairCell({ title, children, left = false, keepCase = false }: { title: string; children: React.ReactNode; left?: boolean; keepCase?: boolean }) {
  return (
    <View style={left ? [copro.cell, copro.cellLeft] : copro.cell}>
      <Text style={keepCase ? [copro.cellLabel, { textTransform: "none" }] : copro.cellLabel}>{title}</Text>
      {children}
    </View>
  )
}

// Tabla propia del Coproscópico (el Examen microscópico va en CoproPdf, igual que en el Coprológico)
function CoproscopicoPdf({ d }: { d: CoproscopicoData }) {
  const gram = [gramPhrase(d), d.gramOtros.trim()].filter(Boolean).join(" ")
  return (
    <View style={copro.block} wrap={false}>
      <Text style={copro.title}>Coproscópico</Text>
      <View style={copro.pairRow}>
        <PairCell title="pH" left keepCase><Text style={copro.cellValue}>{phLabel(d.ph) || "—"}</Text></PairCell>
        <PairCell title="Almidones"><Text style={copro.cellValue}>{d.almidones}</Text></PairCell>
      </View>
      <View style={copro.pairRow}>
        <PairCell title="Grasa fecal" left><Text style={copro.cellValue}>{d.grasa}</Text></PairCell>
        <PairCell title="Sangre oculta">
          <Text style={d.sangreOculta === "Positivo" ? [copro.cellValue, { fontFamily: "Helvetica-Bold" }] : copro.cellValue}>{d.sangreOculta}</Text>
        </PairCell>
      </View>
      <View style={copro.pairRow}>
        <PairCell title="Tinción Wright / Gram">
          <RichText text={gram || "No se observan bacterias."} style={copro.cellValue} />
        </PairCell>
      </View>
    </View>
  )
}

// ── Parcial de Orina (resultado estructurado, ver lib/orina.ts) ──────────────────────────────────
const orina = StyleSheet.create({
  metodo: { fontSize: 8.5, color: C.ink, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: C.salvia50, marginBottom: 2 },
  head: { flexDirection: "row", backgroundColor: C.salvia50, paddingHorizontal: 8, paddingVertical: 4 },
  row: { flexDirection: "row", paddingHorizontal: 8, paddingVertical: 3.5, borderBottomWidth: 0.5, borderBottomColor: C.borderLight },
  cParam: { flex: 2.2, fontSize: 8, color: C.ink },
  cRes: { flex: 1.6, fontSize: 8, color: C.ink },
  cRef: { flex: 1.6, fontSize: 7.5, color: C.ink2 },
  qc: { fontSize: 6.5, color: C.ink2, paddingHorizontal: 8, marginTop: 4, lineHeight: 1.4 },
  legend: { fontSize: 6.5, color: C.ink2, paddingHorizontal: 8, marginTop: 3 },
})
const bold = { fontFamily: "Helvetica-Bold" }

function OrinaTable({ rows }: { rows: { label: string; value: string; ref: string; abnormal: boolean }[] }) {
  return (
    <>
      <View style={orina.head}>
        <Text style={[orina.cParam, styles.thText]}>Parámetro</Text>
        <Text style={[orina.cRes, styles.thText]}>Resultado</Text>
        <Text style={[orina.cRef, styles.thText]}>Valor de referencia</Text>
      </View>
      {rows.map(r => (
        <View key={r.label} style={orina.row}>
          <Text style={orina.cParam}>{r.label}</Text>
          <Text style={r.abnormal ? [orina.cRes, bold] : orina.cRes}>{r.value || "—"}</Text>
          <Text style={orina.cRef}>{r.ref || "—"}</Text>
        </View>
      ))}
    </>
  )
}

function OrinaPdf({ d, species, config, lead }: { d: OrinaData; species: string; config: OrinaConfig; lead: React.ReactNode }) {
  const sp = speciesKey(species)
  const refs = config.ref[sp]
  const row = (p: CatParam | NumParam, value: string, shown = value) =>
    ({ label: PARAM_LABEL[p], value: shown, ref: refs[p].texto, abnormal: isAbnormal(p, value, refs) })
  const upc = upcValue(d)
  const cut = config.upc[sp]
  const upcInterp = upc === null ? null : upcInterpretacion(upc, cut)
  const s = d.sedimento
  const bacterias = s.bacterias.grado === "Negativo"
    ? "Negativo"
    : [s.bacterias.grado, s.bacterias.tipo, s.bacterias.ubicacion].filter(Boolean).join(" · ")
  const cilindros = s.cilindros.ninguno || !s.cilindros.items.some(c => c.tipo)
    ? "0 AP"
    : s.cilindros.items.filter(c => c.tipo).map(c => `${c.tipo}${c.cantidad ? ` ${c.cantidad}` : ""}`).join(", ")
  const cristales = s.cristales.ninguno || !s.cristales.items.some(c => c.tipo)
    ? "No se observan"
    : s.cristales.items.filter(c => c.tipo).map(c => `${c.tipo}${c.cantidad ? ` (${c.cantidad})` : ""}`).join(", ")
  const cells: [string, string, boolean][] = [
    ["Cantidad de sedimento", s.cantidad || "—", false],
    ["Bacterias", bacterias, s.bacterias.grado !== "Negativo"],
    ["Leucocitos (AP)", s.leucocitos || "—", false],
    ["Eritrocitos (AP)", s.eritrocitos || "—", false],
    ["Células epiteliales transicionales (AP)", s.transicionales || "—", false],
    ["Células escamosas (AP)", s.escamosas || "—", false],
    ["Cilindros", cilindros, cilindros !== "0 AP"],
    ["Cristales", cristales, cristales !== "No se observan"],
    ...(s.otros.trim() ? [["Otros", s.otros.trim(), false] as [string, string, boolean]] : []),
  ]
  const pairs = Array.from({ length: Math.ceil(cells.length / 2) }, (_, i) => cells.slice(i * 2, i * 2 + 2))
  const r = d.reactivo

  return (
    <View>
      <View wrap={false}>
        {lead}
        <View style={copro.block}>
          <Text style={copro.title}>Citoquímico de orina</Text>
          <Text style={orina.metodo}>Método de recolección: <Text style={bold}>{d.metodo || "—"}</Text></Text>
        </View>
        <View style={copro.block}>
          <Text style={copro.title}>Examen físico</Text>
          <OrinaTable rows={[
            row("color", d.color, colorOrinaLabel(d)),
            row("aspecto", d.aspecto),
            row("densidad", d.densidad, densidadLabel(d.densidad)),
            row("olor", d.olor || "No evaluado"),
          ]} />
        </View>
      </View>

      <View style={copro.block} wrap={false}>
        <Text style={copro.title}>Examen químico</Text>
        <OrinaTable rows={[
          row("glucosa", d.glucosa), row("bilirrubina", d.bilirrubina), row("cetonas", d.cetonas),
          row("sangre", d.sangre), row("nitritos", d.nitritos), row("leucocitos", d.leucocitos),
          row("ph", d.ph, phOrinaLabel(d.ph)), row("proteinas", d.proteinas),
          row("urobilinogeno", d.urobilinogeno), row("creatinina", d.creatinina),
        ]} />
        <Text style={orina.qc}>
          {r ? `Tirilla / reactivo: ${r.nombre}${r.marca ? ` (${r.marca})` : ""} · Lote ${r.lote} · Vence ${r.vence}. ` : ""}
          Métodos: {d.metodos.trim() || METODOS_DEFAULT}.
        </Text>
      </View>

      <View style={copro.block} wrap={false}>
        <Text style={copro.title}>Pruebas complementarias</Text>
        <View style={copro.pairRow}>
          <PairCell title="Test de Héller (proteínas)" left>
            <Text style={d.heller !== "Negativo" ? [copro.cellValue, bold] : copro.cellValue}>{d.heller}</Text>
          </PairCell>
          <PairCell title="Anillo de Héller (bilirrubina)">
            <Text style={d.anilloHeller !== "Negativo" ? [copro.cellValue, bold] : copro.cellValue}>{d.anilloHeller}</Text>
          </PairCell>
        </View>
        <View style={copro.pairRow}>
          <PairCell title="Ratio proteína / creatinina (UPC)">
            <Text style={copro.cellValue}>
              {upc === null ? "—" : <Text style={upcInterp !== "No proteinúrico" ? bold : {}}>{upc.toFixed(2)} · {upcInterp}</Text>}
            </Text>
            <Text style={[copro.cellLabel, { textTransform: "none", marginTop: 2 }]}>
              {species === "Felino" ? "Felino" : "Canino"}: {"<"}{cut.limitrofe} no proteinúrico · {cut.limitrofe}–{cut.proteinurico} limítrofe · {">"}{cut.proteinurico} proteinúrico
              {d.proteinaMgDl.trim() ? " · proteína urinaria medida por otro método" : ""}
            </Text>
          </PairCell>
        </View>
      </View>

      <View style={copro.block} wrap={false}>
        <Text style={copro.title}>Sedimento urinario</Text>
        {pairs.map((pair, i) => (
          <View key={i} style={copro.pairRow}>
            {pair.map(([t, v, b], j) => (
              <PairCell key={t} title={t} left={j === 0 && pair.length === 2}>
                <Text style={b ? [copro.cellValue, bold] : copro.cellValue}>{v}</Text>
              </PairCell>
            ))}
          </View>
        ))}
        <Text style={orina.legend}>{LEYENDA_BACTERIAS}</Text>
      </View>

      {!!d.observaciones.trim() && (
        <View style={copro.block} wrap={false}>
          <Text style={copro.title}>Observaciones</Text>
          <RichText text={d.observaciones} style={copro.paragraph} />
        </View>
      )}

      <View style={copro.block} wrap={false}>
        <Text style={copro.note}>Nota: {NOTA_ORINA}</Text>
      </View>
    </View>
  )
}

// Posición de una sección entre las secciones de coprológico del examen (0 en un coprológico normal)
const coproIndex = (sections: { id: string; name: string }[], section: { id: string }) =>
  sections.filter(s => isCoproSection(s.name) || isCoproscopicoSection(s.name)).findIndex(s => s.id === section.id)

function CoproPdf({ data, photo, lead, extra }: { data: CoproData; photo: string | null; lead: React.ReactNode; extra?: React.ReactNode }) {
  const fecha = data.fecha ? data.fecha.split("-").reverse().join("/") : ""
  const protozoos = data.protozoos.items.filter(i => i.hallazgo.trim())
  const huevos = data.flotacion.items.filter(i => i.parasito.trim())
  return (
    <View>
      {/* El título del examen va pegado al primer bloque para que no quede solo al final de una hoja */}
      <View wrap={false}>
        {lead}
        {!!fecha && <Text style={[copro.plain, { marginTop: 6 }]}>Fecha de la muestra: <Text style={{ fontFamily: "Helvetica-Bold" }}>{fecha}</Text></Text>}
        <View style={copro.block}>
          <Text style={copro.title}>Análisis macroscópico</Text>
          <View style={copro.macro}>
            <View style={copro.rows}>
              <CoproRow label="Consistencia" value={data.consistencia} />
              <CoproRow label="Color" value={colorLabel(data)} />
              <CoproRow label="Sangre macroscópica" value={data.sangre} />
              <CoproRow label="Moco" value={data.moco} />
              <CoproRow label="Parásitos adultos" value={data.parasitosAdultos} />
              {!!data.otros.trim() && <CoproRow label="Otros" value={data.otros} />}
            </View>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            {photo && <Image src={photo} style={copro.photo} />}
          </View>
        </View>
      </View>

      <View style={copro.block} wrap={false}>
        <Text style={copro.title}>Examen microscópico</Text>
        <View style={copro.pairRow}>
          <PairCell title="Microbiota" left><Text style={copro.cellValue}>{data.microbiota}</Text></PairCell>
          <PairCell title="Glóbulos rojos"><Text style={copro.cellValue}>{data.globulosRojos}</Text></PairCell>
        </View>
        <View style={copro.pairRow}>
          <PairCell title="Restos alimenticios" left><Text style={copro.cellValue}>{data.restos}</Text></PairCell>
          <PairCell title="Leucocitos"><Text style={copro.cellValue}>{data.leucocitos.trim() || "—"}</Text></PairCell>
        </View>
        <View style={copro.pairRow}>
          <PairCell title="Levaduras" left><Text style={copro.cellValue}>{data.levaduras}</Text></PairCell>
          <PairCell title="Protozoarios">
            {data.protozoos.ninguno || protozoos.length === 0
              ? <Text style={copro.cellValue}>No se observan</Text>
              : protozoos.map((p, i) => <RichText key={i} text={`${p.hallazgo}${p.cantidad ? ` ${p.cantidad}` : ""}`} style={copro.cellValue} />)}
          </PairCell>
        </View>
        <View style={copro.pairRow}>
          <PairCell title="Otros" left><RichText text={data.microOtros.trim() || "—"} style={copro.cellValue} /></PairCell>
          <PairCell title="Técnica de flotación">
            {data.flotacion.ninguno || huevos.length === 0
              ? <Text style={copro.cellValue}>No se observan huevos</Text>
              : huevos.map((h, i) => (
                <Text key={i} style={copro.cellValue}>
                  <Text style={{ fontFamily: "Helvetica-Oblique" }}>{stripMarkup(h.parasito)}</Text>
                  {h.hpg ? ` — ${h.hpg} HPG` : ""}
                </Text>
              ))}
          </PairCell>
        </View>
      </View>

      {extra}

      <View style={copro.block} wrap={false}>
        <Text style={copro.plain}>Técnica: {data.tecnica.trim() || TECNICA_DEFAULT}</Text>
        <Text style={copro.note}>Nota: {NOTA_FIJA}</Text>
      </View>

      {!!data.observaciones.trim() && (
        <View style={copro.block} wrap={false}>
          <Text style={copro.title}>Observaciones</Text>
          <RichText text={data.observaciones} style={copro.paragraph} />
        </View>
      )}
    </View>
  )
}

function PatientInfo({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ minWidth: 80, marginRight: 12 }}>
      <Text style={styles.patientLabel}>{label}</Text>
      <Text style={styles.patientValue}>{value}</Text>
    </View>
  )
}

export function PdfReport({ order }: { order: OrderData }) {
  const dateStr = new Date(order.createdAt).toLocaleDateString("es-CO", {
    year: "numeric", month: "long", day: "numeric",
  })

  return (
    <Document title={`Reporte ${order.orderNumber} — Pets & Lab`}>
      <Page size="A4" style={styles.page}>
        {/* Header — fixed so it appears on every page */}
        <View style={styles.header} fixed>
          <Image src={LOGO} style={styles.headerLogo} />
          <View style={styles.headerRight}>
            <Text style={styles.headerTitle}>Reporte de Laboratorio</Text>
            <Text style={styles.headerMono}>N° {order.orderNumber}</Text>
            <Text style={styles.headerMono}>{dateStr}</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* Patient info */}
          <View style={styles.patientBar}>
            <PatientInfo label="Paciente" value={order.patientName} />
            <PatientInfo label="Especie" value={order.species} />
            {order.breed && <PatientInfo label="Raza" value={order.breed} />}
            {order.age && <PatientInfo label="Edad" value={order.age} />}
            {order.sex && <PatientInfo label="Sexo" value={order.sex === "M" ? "Macho" : "Hembra"} />}
            {order.ownerName && <PatientInfo label="Propietario" value={order.ownerName} />}
            {order.clinic && <PatientInfo label="Clínica" value={order.clinic.name} />}
            {order.branch && <PatientInfo label="Sede" value={`${order.branch.name} · ${order.branch.address}`} />}
            {order.requestingVet && <PatientInfo label="Veterinario" value={order.requestingVet} />}
          </View>

          {/* Exams */}
          {order.exams.map(exam => {
            const resultMap = Object.fromEntries(exam.results.map(r => [r.fieldId, r]))
            const header = (
              <View style={styles.examHeader}>
                <Text style={styles.examTitle}>{exam.template.name}</Text>
                <Text style={styles.examArea}>{exam.template.area}</Text>
              </View>
            )
            const hasSections = !exam.attachedPdf && exam.template.sections.length > 0
            const refTable = referenceTableFor(exam.template.name)
            return (
              // Los perfiles no caben en una página: el examen puede partirse, pero cada sección va entera.
              // Comentarios y fotos van FUERA del bloque del examen: si quedaban dentro y no cabían en la hoja,
              // react-pdf movía el examen completo a la siguiente y dejaba la página en blanco.
              <Fragment key={exam.id}>
              <View>
                {/* El título va dentro del bloque (sin partir) de la primera sección: si la tabla no cabe
                    en la hoja, pasan juntos a la siguiente en vez de dejar el título solo al final */}
                {!hasSections && <View wrap={false} minPresenceAhead={40}>{header}</View>}

                {exam.attachedPdf && (
                  <Text style={styles.attachedNote}>Resultado en el documento adjunto (páginas siguientes).</Text>
                )}

                {hasSections && exam.template.sections.map((section, si) => isOrinaSection(section.name) ? (
                  <OrinaPdf
                    key={section.id}
                    d={readOrina(exam.structured)}
                    species={order.species}
                    config={order.orinaConfig ?? ORINA_CONFIG_DEFAULT}
                    lead={<>
                      {si === 0 && header}
                      {exam.template.sections.length > 1 && <Text style={styles.sectionLabel}>{section.name}</Text>}
                    </>}
                  />
                ) : isCoproSection(section.name) || isCoproscopicoSection(section.name) ? (
                  <CoproPdf
                    key={section.id}
                    data={readCoproAt(exam.structured, coproIndex(exam.template.sections, section))}
                    photo={exam.macroPhotos?.[coproPhotoRole(coproIndex(exam.template.sections, section))] ?? null}
                    extra={isCoproscopicoSection(section.name) ? <CoproscopicoPdf d={readCoproscopico(exam.structured)} /> : undefined}
                    lead={<>
                      {si === 0 && header}
                      {exam.template.sections.length > 1 && <Text style={styles.sectionLabel}>{section.name}</Text>}
                    </>}
                  />
                ) : (
                  <View key={section.id} wrap={false}>
                    {si === 0 && header}
                    {exam.template.sections.length > 1 && (
                      <Text style={styles.sectionLabel}>{section.name}</Text>
                    )}

                    {isDescriptiveSection(section.name, exam.template.name) ? (
                      <>
                        <View style={styles.tableHead}>
                          <View style={styles.colParam}><Text style={styles.thText}>Parámetro</Text></View>
                          <View style={styles.colDesc}><Text style={styles.thText}>Descripción</Text></View>
                        </View>
                        {section.fields.map((field, fi) => (
                          <View key={field.id} style={[styles.descRow, fi % 2 !== 0 ? styles.tableRowAlt : {}]}>
                            <View style={styles.colParam}><Text style={styles.tdText}>{field.name}</Text></View>
                            <View style={styles.colDesc}>
                              <Text style={styles.descText}>{resultMap[field.id]?.value || "—"}</Text>
                            </View>
                          </View>
                        ))}
                      </>
                    ) : (<>
                    {/* Table header */}
                    <View style={styles.tableHead}>
                      <View style={styles.colParam}><Text style={styles.thText}>Parámetro</Text></View>
                      <View style={styles.colUnit}><Text style={styles.thText}>Unidad</Text></View>
                      <View style={styles.colResult}><Text style={styles.thText}>Resultado</Text></View>
                      <View style={styles.colRef}><Text style={styles.thText}>Ref. Can.</Text></View>
                      <View style={styles.colRef}><Text style={styles.thText}>Ref. Fel.</Text></View>
                      <View style={styles.colTech}><Text style={styles.thText}>Técnica</Text></View>
                    </View>

                    {section.fields.map((field, fi) => {
                      const result = resultMap[field.id]
                      const value = result?.value ?? "—"
                      // Igual que en el formulario: se evalúa con el rango de la especie (bajo azul, alto rojo)
                      const status = getRangeStatus(result?.value, refForSpecies(order.species, field))
                      const flagged = status !== "normal"

                      return (
                        <View
                          key={field.id}
                          style={[
                            styles.tableRow,
                            fi % 2 !== 0 ? styles.tableRowAlt : {},
                            status === "low" ? styles.tableRowLow : status === "high" ? styles.tableRowHigh : {},
                          ]}
                        >
                          <View style={styles.colParam}><Text style={styles.tdText}>{field.name}</Text></View>
                          <View style={styles.colUnit}><Text style={styles.tdMono}>{field.unit ?? ""}</Text></View>
                          <View style={styles.colResult}>
                            <Text style={status === "low" ? styles.tdLow : status === "high" ? styles.tdHigh : styles.tdText}>
                              {value}{flagged ? " *" : ""}
                            </Text>
                          </View>
                          <View style={styles.colRef}><Text style={styles.tdMono}>{field.refCanine ?? "—"}</Text></View>
                          <View style={styles.colRef}><Text style={styles.tdMono}>{field.refFeline ?? "—"}</Text></View>
                          <View style={styles.colTech}><Text style={styles.tdMono}>{field.technique ?? "—"}</Text></View>
                        </View>
                      )
                    })}
                    </>)}
                  </View>
                ))}

                {hasSections && refTable && (
                  <View wrap={false}>
                    <Text style={styles.sectionLabel}>{refTable.title}</Text>
                    <View style={styles.tableHead}>
                      {refTable.columns.map(c => (
                        <View key={c} style={{ flex: 1 }}><Text style={styles.thText}>{c}</Text></View>
                      ))}
                    </View>
                    {refTable.rows.map((row, ri) => (
                      <View key={ri} style={[styles.tableRow, ri % 2 !== 0 ? styles.tableRowAlt : {}]}>
                        {row.map((cell, ci) => (
                          <View key={ci} style={{ flex: 1 }}><Text style={ci === 0 ? styles.tdText : styles.tdMono}>{cell}</Text></View>
                        ))}
                      </View>
                    ))}
                    {!!refTable.note && <Text style={styles.attachedNote}>{refTable.note}</Text>}
                  </View>
                )}

                {exam.extraPdf && (
                  <Text style={styles.attachedNote}>Se adjunta además un documento (páginas siguientes).</Text>
                )}
              </View>

                {exam.comments && (
                  <View wrap={false}>
                    <Text style={styles.notesLabel}>Comentarios</Text>
                    <Text style={styles.notesText}>{exam.comments}</Text>
                  </View>
                )}

                {/* Fotos en filas de a 2; el título va pegado a la primera fila para que no quede solo */}
                {exam.photos && exam.photos.length > 0 &&
                  Array.from({ length: Math.ceil(exam.photos.length / 2) }, (_, row) => (
                    <View key={row} wrap={false}>
                      {row === 0 && <Text style={styles.notesLabel}>Fotos</Text>}
                      <View style={styles.photoGrid}>
                        {exam.photos!.slice(row * 2, row * 2 + 2).map(p => (
                          <View key={p.id} style={styles.photoFrame}>
                            {/* eslint-disable-next-line jsx-a11y/alt-text */}
                            <Image src={p.src} style={styles.photo} />
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                <View style={styles.examBlock} />
              </Fragment>
            )
          })}

          <Text style={styles.attachedNote}>
            * Valor fuera del rango de referencia: <Text style={{ color: RANGE_COLORS.low }}>azul = bajo</Text>, <Text style={{ color: RANGE_COLORS.high }}>rojo = alto</Text>.
          </Text>

          {/* Firmas (van en todos los reportes, siempre juntas): director de laboratorio y microbiólogo */}
          <View wrap={false}>
          <View style={styles.signBlock}>
            <View style={styles.signText}>
              <Text style={styles.signRole}>Director de Laboratorio</Text>
              <Text style={styles.signName}>Dr. Marcelo Valencia Vargas</Text>
              <Text style={styles.signDetail}>Universidad de Caldas - M.V.Z</Text>
              <Text style={styles.signDetail}>Especialista en Laboratorio Clínico Veterinario - U.D.C.A</Text>
              <Text style={styles.signDetail}>M.P. 37708</Text>
            </View>
            <View style={styles.signSignature}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={SIGNATURE} style={styles.signImage} />
              <View style={styles.signLine} />
            </View>
          </View>
          <View style={styles.signBlock2}>
            <View style={styles.signText}>
              <Text style={styles.signName}>Anderson Yemin Angulo Valencia</Text>
              <Text style={styles.signDetail}>Microbiólogo</Text>
              <Text style={styles.signDetail}>Universidad Santiago de Cali</Text>
            </View>
            <View style={styles.signSignature}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              <Image src={SIGNATURE_ANDERSON} style={styles.signImageWide} />
              <View style={styles.signLine} />
            </View>
          </View>
          </View>
        </View>

        {/* Page footer */}
        <View style={styles.footer} fixed>
          <View>
            <Text style={styles.footerText}>
              <Text style={styles.footerBold}>Pets &amp; Lab</Text> · {SITE.address} · {SITE.domain}
            </Text>
            <Text style={[styles.footerText, { marginTop: 3 }]}>WhatsApp +57 {SITE.phone}</Text>
          </View>
          <Text style={styles.footerText}>Los resultados son válidos únicamente para esta muestra.</Text>
        </View>
      </Page>
    </Document>
  )
}
