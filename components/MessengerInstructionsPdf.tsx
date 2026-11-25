// PDF "Instrucciones para mensajeros" (/clientes/mensajeros/instrucciones): reglas de la ruta fija explicadas para
// los mensajeros, beneficio por paquete no agendado, la ruta de cada uno y una hoja de registro.
// Helvetica: solo caracteres Latin-1 (nada de flechas ni símbolos especiales).
import React from "react"
import path from "path"
import fs from "fs"
import { Document, Page, View, Text, Image, StyleSheet, Font } from "@react-pdf/renderer"
import { BONO_PAQUETE, hora, JORNADA, MENSAJEROS, type Ruta } from "@/lib/messengerRoutes"
import type { SedePunto } from "@/lib/messengerData"

const LOGO = `data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), "public", "logos", "pets-lab-cream.png")).toString("base64")}`
Font.registerHyphenationCallback(word => [word])

const C = { salvia: "#3a4a3f", salvia50: "#f2f5f2", bone: "#faf6ee", ink: "#1a1a18", ink2: "#4a4a44", line: "#d9e0d9", red: "#b91c1c" }
const peso = (v: number) => "$" + v.toLocaleString("es-CO")

const s = StyleSheet.create({
  page: { backgroundColor: "#ffffff", paddingTop: 78, paddingBottom: 40, paddingHorizontal: 36, fontFamily: "Helvetica", fontSize: 10.5, color: C.ink, lineHeight: 1.4 },
  header: { position: "absolute", top: 0, left: 0, right: 0, backgroundColor: C.salvia, paddingHorizontal: 36, paddingVertical: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logo: { width: 90, height: 35, objectFit: "contain" },
  hTitle: { color: C.bone, fontSize: 8, letterSpacing: 2, textTransform: "uppercase", textAlign: "right" },
  hSub: { color: "#a3b8a4", fontSize: 7, marginTop: 2, textAlign: "right" },
  h1: { fontFamily: "Helvetica-Bold", fontSize: 20, marginBottom: 6 },
  h2: { fontFamily: "Helvetica-Bold", fontSize: 13, marginTop: 14, marginBottom: 6 },
  p: { marginBottom: 6 },
  b: { fontFamily: "Helvetica-Bold" },
  intro: { backgroundColor: C.salvia50, borderLeftWidth: 3, borderLeftColor: C.salvia, padding: 10, marginBottom: 4 },
  rule: { flexDirection: "row", borderWidth: 1, borderColor: C.line, marginBottom: 8 },
  ruleNum: { width: 34, backgroundColor: C.salvia, color: C.bone, fontFamily: "Helvetica-Bold", fontSize: 18, textAlign: "center", paddingTop: 8 },
  ruleBody: { flex: 1, padding: 9 },
  ruleTitle: { fontFamily: "Helvetica-Bold", fontSize: 12, marginBottom: 3 },
  why: { fontSize: 9.5, color: C.ink2, marginTop: 3 },
  say: { fontSize: 10, fontFamily: "Helvetica-Oblique", marginTop: 3, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: C.line },
  row: { flexDirection: "row", borderBottomWidth: 0.7, borderBottomColor: C.line, paddingVertical: 5, paddingHorizontal: 6 },
  rowHead: { flexDirection: "row", backgroundColor: C.salvia50, paddingVertical: 5, paddingHorizontal: 6 },
  th: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: C.ink2, textTransform: "uppercase", letterSpacing: 0.5 },
  bono: { borderWidth: 1.5, borderColor: C.salvia, padding: 10, marginTop: 6 },
  big: { fontFamily: "Helvetica-Bold", fontSize: 16, color: C.salvia },
  mBand: { paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10 },
  mName: { color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 18 },
  mSub: { color: "#ffffff", fontSize: 10, marginTop: 2 },
  stopNum: { width: 26, height: 26, borderRadius: 13, color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 12, textAlign: "center", paddingTop: 6 },
})

function Header({ fecha }: { fecha: string }) {
  return (
    <View style={s.header} fixed>
      <Image src={LOGO} style={s.logo} />
      <View>
        <Text style={s.hTitle}>Instrucciones para mensajeros</Text>
        <Text style={s.hSub}>Pets &amp; Lab · {fecha}</Text>
      </View>
    </View>
  )
}

function Regla({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <View style={s.rule} wrap={false}>
      <Text style={s.ruleNum}>{n}</Text>
      <View style={s.ruleBody}>
        <Text style={s.ruleTitle}>{titulo}</Text>
        {children}
      </View>
    </View>
  )
}

export function MessengerInstructionsPdf({ rutas, fecha }: { rutas: Ruta<SedePunto>[]; fecha: string }) {
  // Un mensajero sin paradas (mapa armado a mano) no sale; los colores siguen su posición (Rojo = 0, Azul = 1…)
  const nombres = rutas.map((r, i) => (r.orden.length ? `Mensajero ${MENSAJEROS[i % MENSAJEROS.length].nombre}` : "")).filter(Boolean)
  const listaNombres = nombres.length > 1 ? nombres.slice(0, -1).join(", ") + " y " + nombres[nombres.length - 1] : nombres[0] ?? "Mensajero Rojo"
  const ej = nombres[0] ?? "Mensajero Rojo"
  const variasVueltas = rutas.some(r => r.vueltas >= 2)

  return (
    <Document title="Instrucciones para mensajeros" author="Pets & Lab">
      {/* ── Página 1: cómo funciona y las reglas ── */}
      <Page size="LETTER" style={s.page}>
        <Header fecha={fecha} />
        <Text style={s.h1}>Cómo trabajamos con rutas fijas</Text>
        <View style={s.intro}>
          <Text style={s.p}>
            Desde ahora cada mensajero tiene <Text style={s.b}>un color y una ruta fija</Text>: {listaNombres}. Tu ruta son
            siempre las mismas clínicas, en el mismo orden y a la misma hora. Sales del laboratorio, pasas por cada clínica de tu
            lista y vuelves al laboratorio con las muestras.
          </Text>
          <Text>
            <Text style={s.b}>¿Por qué?</Text> Cuando las clínicas saben a qué hora pasas, no tienen que llamar: guardan las
            muestras para ti. Y muchas veces, si alguien pasa y pregunta, la clínica manda muestras que no iba a mandar. Una ruta
            que se cumple siempre igual es lo que hace que las clínicas confíen en nosotros.
          </Text>
        </View>

        <Text style={s.h2}>Las 4 reglas de la ruta</Text>

        <Regla n={1} titulo="Siempre haces tu ruta completa, aunque nadie haya pedido exámenes">
          <Text>Pasas por todas las clínicas de tu lista, en todas tus vueltas, aunque ese día ninguna haya solicitado recogida. Entras y preguntas:</Text>
          <Text style={s.say}>&quot;Buenos días, vengo de Pets &amp; Lab. ¿Tienen muestras para llevar al laboratorio?&quot;</Text>
          <Text style={s.why}>Por qué: la visita es lo que trae las muestras. Si solo vamos cuando nos llaman, perdemos las que nos darían al vernos llegar.</Text>
        </Regla>

        <Regla n={2} titulo="Nunca te saltas una clínica: sigues tu orden">
          <Text>
            Ejemplo: el {ej} va en la clínica 3 y lo llaman de la clínica 5. <Text style={s.b}>No se salta la 4.</Text> Sigue su
            orden: 3, después 4, después 5. La clínica 5 sabe que vas en camino.
          </Text>
          <Text style={s.why}>Por qué: si te saltas la 4, esa clínica se queda sin su visita y la próxima vez ya no te guarda las muestras. El orden está pensado para que el recorrido sea el más corto.</Text>
        </Regla>

        <Regla n={3} titulo="No esperas: preguntas y sigues">
          <Text>
            Si llegas y no tienen muestras, solo preguntas si tienen algo para llevar. Si te dicen &quot;no tenemos, pero justo
            estamos sacando unas, espéranos 20 minuticos&quot;, <Text style={s.b}>no puedes esperar: te vas</Text>. Responde con amabilidad:
          </Text>
          <Text style={s.say}>
            &quot;Qué pena, no puedo esperar porque me están esperando en las otras clínicas.{variasVueltas ? " Las recojo en mi próxima vuelta." : ""} Si es urgente, llamen al laboratorio.&quot;
          </Text>
          <Text style={s.why}>Por qué: 20 minutos esperando en una clínica son 20 minutos de retraso para todas las clínicas que siguen en tu ruta.</Text>
        </Regla>

        <Regla n={4} titulo="Cumples tu horario: sales y vuelves al laboratorio en cada vuelta">
          <Text>
            En tu hoja está tu horario: a qué hora sale cada vuelta. Cada vuelta termina entregando las muestras en el
            laboratorio. Entre una vuelta y la siguiente tienes una pausa corta de {JORNADA.PAUSA} minutos; a la hora de la
            siguiente vuelta, sales otra vez. No hay tiempo de espera: el día está armado para que siempre estés en ruta.
          </Text>
          <Text style={s.why}>Por qué: cada vuelta es otra oportunidad de traer muestras. Las clínicas que saben que vuelves en un par de horas te guardan las muestras en vez de mandarlas a otro laboratorio.</Text>
        </Regla>
      </Page>

      {/* ── Página 2: beneficio por paquete no agendado ── */}
      <Page size="LETTER" style={s.page}>
        <Header fecha={fecha} />
        <Text style={s.h1}>Tu beneficio: {peso(BONO_PAQUETE)} por paquete no agendado</Text>
        <View style={s.bono}>
          <Text style={s.p}>
            Por cada <Text style={s.b}>paquete de muestras</Text> que recojas y que <Text style={s.b}>NO estaba agendado</Text>,
            recibes <Text style={s.big}>{peso(BONO_PAQUETE)}</Text>.
          </Text>
          <Text style={s.p}>
            <Text style={s.b}>No agendado</Text> quiere decir que la clínica no había pedido la recogida (ni por el Portal Vet, ni
            por llamada, ni por WhatsApp). Te dieron las muestras porque pasaste y preguntaste: esas muestras llegaron gracias a ti.
          </Text>
          <Text>
            <Text style={s.b}>Un paquete</Text> es todo lo que una clínica te entrega en una misma visita, sin importar cuántos
            exámenes sean. Si te dan un hemograma y un perfil básico, es <Text style={s.b}>un solo paquete</Text>: {peso(BONO_PAQUETE)} en
            total, no {peso(BONO_PAQUETE)} por cada examen.
          </Text>
        </View>

        <Text style={s.h2}>Ejemplos</Text>
        <View style={s.rowHead}>
          <Text style={[s.th, { flex: 3 }]}>Qué pasó</Text>
          <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Beneficio</Text>
        </View>
        {[
          ["Pasas, preguntas y te dan un hemograma que no habían pedido.", peso(BONO_PAQUETE)],
          ["Pasas, preguntas y te dan un hemograma y un perfil básico juntos.", `${peso(BONO_PAQUETE)} (un paquete)`],
          ["La clínica había pedido la recogida antes de que llegaras.", "$0 (es parte de tu ruta)"],
          ["Pasas y no tienen muestras.", "$0 (pero la visita era obligatoria)"],
          ["Te piden que esperes 20 minutos mientras sacan la muestra.", "No esperas (regla 3)"],
        ].map(([a, b], i) => (
          <View key={i} style={s.row} wrap={false}>
            <Text style={{ flex: 3 }}>{a}</Text>
            <Text style={{ flex: 1, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{b}</Text>
          </View>
        ))}

        <Text style={s.h2}>Cómo se registra (por ahora)</Text>
        <Text style={s.p}>
          Cada vez que recojas un paquete no agendado, anótalo en la hoja de registro (al final de este documento): fecha,
          clínica y hora. Al entregar las muestras en el laboratorio, pide que te firmen esa línea. Solo se pagan los paquetes
          anotados y firmados.
        </Text>
      </Page>

      {/* ── Una página por mensajero: su ruta ── */}
      {rutas.map((r, i) => {
        const m = MENSAJEROS[i % MENSAJEROS.length]
        if (!r.orden.length) return null
        return (
          <Page key={i} size="LETTER" style={s.page}>
            <Header fecha={fecha} />
            <View style={[s.mBand, { backgroundColor: m.color }]}>
              <Text style={s.mName}>Mensajero {m.nombre}</Text>
              <Text style={s.mSub}>
                {r.vueltas} {r.vueltas === 1 ? "vuelta" : "vueltas"} al día · {r.orden.length} clínicas · unos {r.km.toFixed(0)} km por vuelta
              </Text>
            </View>
            <Text style={[s.h2, { marginTop: 4 }]}>Tu horario</Text>
            <View style={s.rowHead}>
              <Text style={[s.th, { flex: 1 }]}>Vuelta</Text>
              <Text style={[s.th, { flex: 1 }]}>Sales del laboratorio</Text>
              <Text style={[s.th, { flex: 1 }]}>Vuelves (aprox.)</Text>
            </View>
            {r.horario.map((v, j) => (
              <View key={j} style={s.row} wrap={false}>
                <Text style={{ flex: 1, fontFamily: "Helvetica-Bold" }}>Vuelta {j + 1}</Text>
                <Text style={{ flex: 1, fontFamily: "Helvetica-Bold" }}>{hora(v.sale)}</Text>
                <Text style={{ flex: 1 }}>{hora(v.vuelve)}</Text>
              </View>
            ))}
            <Text style={{ fontSize: 9, color: C.ink2, marginTop: 4 }}>
              Almuerzo: 1 hora, entre la vuelta de la mañana y la de la tarde. Si un día terminas antes, avisa en el laboratorio.
            </Text>
            <Text style={s.h2}>Tu ruta, en este orden</Text>
            <View style={s.row} wrap={false}>
              <Text style={[s.stopNum, { backgroundColor: C.ink }]}>L</Text>
              <View style={{ flex: 1, paddingLeft: 10 }}>
                <Text style={s.b}>Salida: Laboratorio Pets &amp; Lab</Text>
                <Text style={{ color: C.ink2, fontSize: 9.5 }}>Calle 10 #31-143, Colseguros</Text>
              </View>
            </View>
            {r.orden.map((p, j) => (
              <View key={p.id} style={s.row} wrap={false}>
                <Text style={[s.stopNum, { backgroundColor: m.color }]}>{j + 1}</Text>
                <View style={{ flex: 1, paddingLeft: 10 }}>
                  <Text style={s.b}>{p.name}</Text>
                  <Text style={{ color: C.ink2, fontSize: 9.5 }}>{[p.address, p.phone && `Tel. ${p.phone}`].filter(Boolean).join(" · ")}</Text>
                </View>
              </View>
            ))}
            <View style={s.row} wrap={false}>
              <Text style={[s.stopNum, { backgroundColor: C.ink }]}>L</Text>
              <View style={{ flex: 1, paddingLeft: 10 }}>
                <Text style={s.b}>Regreso: Laboratorio Pets &amp; Lab (entregas las muestras)</Text>
              </View>
            </View>
            {r.pedido.length > 0 && (
              <>
                <Text style={s.h2}>Clínicas de tu zona que se recogen solo si llaman</Text>
                <Text style={[s.p, { color: C.ink2, fontSize: 9.5 }]}>
                  No están en tu ruta fija. Si el laboratorio te avisa que una de ellas pidió recogida, la incluyes en la vuelta que
                  estés haciendo, en el punto del recorrido que te quede más cerca, sin saltarte ninguna de tus clínicas.
                </Text>
                {r.pedido.map(p => (
                  <Text key={p.id} style={{ marginBottom: 2 }}>
                    - <Text style={s.b}>{p.name}</Text>
                    <Text style={{ color: C.ink2, fontSize: 9.5 }}>{p.address ? ` · ${p.address}` : ""}{p.phone ? ` · Tel. ${p.phone}` : ""}</Text>
                  </Text>
                ))}
              </>
            )}
          </Page>
        )
      })}

      {/* ── Hoja de registro ── */}
      <Page size="LETTER" style={s.page}>
        <Header fecha={fecha} />
        <Text style={s.h1}>Registro de paquetes no agendados</Text>
        <Text style={[s.p, { color: C.ink2 }]}>
          Mensajero: ______________________ (color) · Un paquete = todo lo que una clínica te entrega en una visita. Lo firma
          quien recibe en el laboratorio.
        </Text>
        <View style={s.rowHead}>
          <Text style={[s.th, { width: 70 }]}>Fecha</Text>
          <Text style={[s.th, { flex: 1 }]}>Clínica</Text>
          <Text style={[s.th, { width: 55 }]}>Hora</Text>
          <Text style={[s.th, { width: 130 }]}>Firma laboratorio</Text>
        </View>
        {Array.from({ length: 22 }, (_, i) => (
          <View key={i} style={[s.row, { height: 25 }]} wrap={false}>
            <Text style={{ width: 70 }} />
            <Text style={{ flex: 1 }} />
            <Text style={{ width: 55 }} />
            <Text style={{ width: 130 }} />
          </View>
        ))}
      </Page>
    </Document>
  )
}
