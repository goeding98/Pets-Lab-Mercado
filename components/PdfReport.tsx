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
import { isDescriptiveSection } from "@/lib/sections"

const logoBuffer = fs.readFileSync(path.join(process.cwd(), "public", "logos", "pets-lab-cream.png"))
const LOGO = `data:image/png;base64,${logoBuffer.toString("base64")}`

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
  page: { backgroundColor: C.bone, padding: 0, paddingTop: 71, paddingBottom: 44, fontFamily: "Helvetica" },
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
  tableRowFlagged: { backgroundColor: "#fff5f5" },

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
  tdFlagged: { fontSize: 8, color: C.red, fontFamily: "Helvetica-Bold" },
  tdFlagMark: { fontSize: 7, color: C.red },

  // Footer
  footer: { position: "absolute", bottom: 18, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: C.borderLight, paddingTop: 8 },
  footerText: { fontSize: 6.5, color: C.ink2, letterSpacing: 1 },
  footerBold: { fontFamily: "Helvetica-Bold", color: C.salvia700 },

  attachedNote: { fontSize: 8, color: C.ink2, marginTop: 8, fontFamily: "Helvetica-Oblique" },
  notesLabel: { fontSize: 6.5, color: C.ink2, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 10, marginBottom: 4 },
  notesText: { fontSize: 8.5, color: C.ink, lineHeight: 1.4 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  photo: { width: 250, height: 188, objectFit: "contain", marginRight: 10, marginBottom: 10, backgroundColor: C.salvia50 },

  signBlock: { marginTop: 24, paddingTop: 16, borderTopWidth: 0.5, borderTopColor: C.borderLight, alignItems: "flex-end" },
  signLine: { width: 160, borderBottomWidth: 0.5, borderBottomColor: C.ink2, marginBottom: 4 },
  signName: { fontSize: 8, color: C.ink, fontFamily: "Helvetica-Bold" },
  signRole: { fontSize: 6.5, color: C.ink2, letterSpacing: 1.2, textTransform: "uppercase" },
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
  processedBy?: { name: string } | null
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
    attachedPdf?: boolean // el resultado es un PDF subido (va en las páginas siguientes)
  }[]
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
  const processedByName = order.processedBy?.name ?? "Microbiólogo"
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
            return (
              // Los perfiles no caben en una página: el examen puede partirse, pero cada sección va entera
              <View key={exam.id} style={styles.examBlock}>
                {/* El título va dentro del bloque (sin partir) de la primera sección: si la tabla no cabe
                    en la hoja, pasan juntos a la siguiente en vez de dejar el título solo al final */}
                {!hasSections && <View wrap={false} minPresenceAhead={40}>{header}</View>}

                {exam.attachedPdf && (
                  <Text style={styles.attachedNote}>Resultado en el documento adjunto (páginas siguientes).</Text>
                )}

                {hasSections && exam.template.sections.map((section, si) => (
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
                      const flagged = result?.flagged ?? false

                      return (
                        <View
                          key={field.id}
                          style={[
                            styles.tableRow,
                            fi % 2 !== 0 ? styles.tableRowAlt : {},
                            flagged ? styles.tableRowFlagged : {},
                          ]}
                        >
                          <View style={styles.colParam}><Text style={styles.tdText}>{field.name}</Text></View>
                          <View style={styles.colUnit}><Text style={styles.tdMono}>{field.unit ?? ""}</Text></View>
                          <View style={styles.colResult}>
                            <Text style={flagged ? styles.tdFlagged : styles.tdText}>
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
                          // eslint-disable-next-line jsx-a11y/alt-text
                          <Image key={p.id} src={p.src} style={styles.photo} />
                        ))}
                      </View>
                    </View>
                  ))}
              </View>
            )
          })}

          <Text style={styles.attachedNote}>* Valor fuera del rango de referencia.</Text>

          {/* Signature */}
          <View style={styles.signBlock}>
            <View style={styles.signLine} />
            <Text style={styles.signName}>{processedByName}</Text>
            <Text style={styles.signRole}>Microbiólogo — Pets &amp; Lab</Text>
          </View>
        </View>

        {/* Page footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            <Text style={styles.footerBold}>Pets &amp; Lab</Text> · Cl. 10 #31-143, Cali · petslab.com.co
          </Text>
          <Text style={styles.footerText}>Los resultados son válidos únicamente para esta muestra.</Text>
        </View>
      </Page>
    </Document>
  )
}
