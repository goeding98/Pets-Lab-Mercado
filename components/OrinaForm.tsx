"use client"
import {
  ANILLO_HELLER, ASPECTO, BACTERIAS_GRADO, BACTERIAS_TIPO, BACTERIAS_UBICACION, CANTIDAD_SEDIMENTO, CILINDROS,
  COLOR_ORINA, CRISTALES, CRUCES, HELLER, LEYENDA_BACTERIAS, METODO_RECOLECCION, NOTA_ORINA, OLOR, POR_CAMPO,
  PROTEINAS, TIRA, densidadError, isAbnormal, loteVencido, phOrinaError, speciesKey, upcInterpretacion, upcValue,
  type CatParam, type NumParam, type OrinaConfig, type OrinaData, type Reactivo,
} from "@/lib/orina"
import { FreeSelect, Select, heading, input, label } from "./CoproForm"

// Formulario del Parcial de Orina (resultado estructurado, ver lib/orina.ts). Lo pinta ExamResultForm
// en lugar de la tabla de campos cuando la sección es "Parcial de Orina". Las listas sugieren opciones
// pero dejan digitar otro valor (FreeSelect).

const chip = "border border-black/15 bg-white px-2 py-0.5 font-mono text-[10px] text-ink hover:border-salvia-700 hover:text-salvia-700"
const th = "font-mono text-[8px] tracking-[0.15em] text-salvia-700 uppercase pb-2 pr-3 text-left"

// Fila Parámetro | Resultado | Referencia (resultado anormal en negrita). Fuera del componente
// principal para que React no la vuelva a montar (y los campos no pierdan el foco) en cada tecla.
function Row({ param, val, refs, children }: { param: CatParam | NumParam; val: string; refs: OrinaConfig["ref"]["canino"]; children: React.ReactNode }) {
  return (
    <tr className="border-t border-black/[0.05] align-top">
      <td className="py-1.5 pr-3 font-sans text-xs text-ink w-[38%]">{labelOf(param)}</td>
      <td className="py-1.5 pr-3 w-[34%]">
        {children}
        {isAbnormal(param, val, refs) && <span className="block font-sans text-[10px] font-bold text-ink mt-0.5">Fuera de lo normal (negrita en el PDF)</span>}
      </td>
      <td className="py-1.5 font-mono text-[10px] text-ink-2">{refs[param].texto}</td>
    </tr>
  )
}

export default function OrinaForm({
  value, onChange, locked, species, config, reagents,
}: {
  value: OrinaData
  onChange: (v: OrinaData) => void
  locked: boolean
  species: string
  config: OrinaConfig
  reagents: Reactivo[]
}) {
  const set = <K extends keyof OrinaData>(k: K, v: OrinaData[K]) => onChange({ ...value, [k]: v })
  const sed = value.sedimento
  const setSed = <K extends keyof OrinaData["sedimento"]>(k: K, v: OrinaData["sedimento"][K]) => set("sedimento", { ...sed, [k]: v })
  const sp = speciesKey(species)
  const refs = config.ref[sp]
  const upc = upcValue(value)
  const vencido = loteVencido(value.reactivo)

  const tiraSelect = (k: "glucosa" | "bilirrubina" | "cetonas" | "sangre" | "nitritos" | "leucocitos") => (
    <Row key={k} refs={refs} param={k} val={value[k]}>
      <FreeSelect value={value[k]} options={TIRA} onChange={v => set(k, v)} disabled={locked} />
    </Row>
  )

  return (
    <div className="space-y-6">
      {/* Método de recolección: visible arriba */}
      <div className="border border-salvia-700/30 bg-salvia-50/60 px-4 py-3">
        <span className={label}>Método de recolección *</span>
        <FreeSelect value={value.metodo} options={METODO_RECOLECCION} onChange={v => set("metodo", v)} disabled={locked} />
      </div>

      {/* Examen físico */}
      <div>
        <p className={heading}>Examen físico</p>
        <table className="w-full">
          <thead><tr><th className={th}>Parámetro</th><th className={th}>Resultado</th><th className={th}>Referencia ({species || "Canino"})</th></tr></thead>
          <tbody>
            <Row refs={refs} param="color" val={value.color}>
              <Select value={value.color} options={COLOR_ORINA} onChange={v => set("color", v)} disabled={locked} />
              {value.color === "Otro" && <input value={value.colorOtro} onChange={e => set("colorOtro", e.target.value)} disabled={locked} placeholder="¿Cuál?" className={`${input} mt-1`} />}
            </Row>
            <Row refs={refs} param="aspecto" val={value.aspecto}>
              <FreeSelect value={value.aspecto} options={ASPECTO} onChange={v => set("aspecto", v)} disabled={locked} />
            </Row>
            <Row refs={refs} param="densidad" val={value.densidad}>
              <input type="number" step="0.001" min={1} max={1.08} value={value.densidad} onChange={e => set("densidad", e.target.value)} disabled={locked} placeholder="1.008" className={input} />
              {densidadError(value.densidad) && <span className="block font-sans text-[10px] text-red-600 mt-0.5">{densidadError(value.densidad)}</span>}
            </Row>
            <Row refs={refs} param="olor" val={value.olor}>
              <FreeSelect value={value.olor} options={OLOR} onChange={v => set("olor", v)} disabled={locked} />
            </Row>
          </tbody>
        </table>
      </div>

      {/* Examen químico */}
      <div>
        <p className={heading}>Examen químico (tirilla reactiva)</p>
        <table className="w-full">
          <thead><tr><th className={th}>Parámetro</th><th className={th}>Resultado</th><th className={th}>Referencia</th></tr></thead>
          <tbody>
            {tiraSelect("glucosa")}
            {tiraSelect("bilirrubina")}
            {tiraSelect("cetonas")}
            {tiraSelect("sangre")}
            {tiraSelect("nitritos")}
            {tiraSelect("leucocitos")}
            <Row refs={refs} param="ph" val={value.ph}>
              <input type="number" step="0.5" min={5} max={9} value={value.ph} onChange={e => set("ph", e.target.value)} disabled={locked} placeholder="5.0 – 9.0" className={input} />
              {phOrinaError(value.ph) && <span className="block font-sans text-[10px] text-red-600 mt-0.5">{phOrinaError(value.ph)}</span>}
            </Row>
            <Row refs={refs} param="proteinas" val={value.proteinas}>
              <FreeSelect value={value.proteinas} options={PROTEINAS} onChange={v => set("proteinas", v)} disabled={locked} />
            </Row>
            <Row refs={refs} param="urobilinogeno" val={value.urobilinogeno}>
              <input type="number" step="any" min={0} value={value.urobilinogeno} onChange={e => set("urobilinogeno", e.target.value)} disabled={locked} placeholder="mg/dL" className={input} />
            </Row>
            <Row refs={refs} param="creatinina" val={value.creatinina}>
              <input type="number" step="any" min={0} value={value.creatinina} onChange={e => set("creatinina", e.target.value)} disabled={locked} placeholder="mg/dL" className={input} />
            </Row>
          </tbody>
        </table>
      </div>

      {/* Control de calidad */}
      <div>
        <p className={heading}>Control de calidad</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className={label}>Tirilla / reactivo usado *</span>
            <select
              value={value.reactivo?.id ?? ""}
              onChange={e => set("reactivo", reagents.find(r => r.id === e.target.value) ?? null)}
              disabled={locked}
              className={input}
            >
              <option value="">Seleccionar del inventario…</option>
              {reagents.map(r => (
                <option key={r.id} value={r.id}>
                  {r.nombre}{r.marca && ` · ${r.marca}`} · Lote {r.lote} · Vence {r.vence}{loteVencido(r) ? " (VENCIDO)" : ""}
                </option>
              ))}
            </select>
            {reagents.length === 0 && (
              <p className="font-sans text-[11px] text-ink-2 mt-1">No hay reactivos con lote y vencimiento en Inventario. Agrégalos allí.</p>
            )}
            {vencido && (
              <p className="font-sans text-xs font-bold text-red-600 mt-1">
                Lote vencido ({value.reactivo!.vence}). No se puede validar el resultado con este reactivo.
              </p>
            )}
          </div>
          <div>
            <span className={label}>Métodos</span>
            <input value={value.metodos} onChange={e => set("metodos", e.target.value)} disabled={locked} className={input} />
          </div>
        </div>
      </div>

      {/* Pruebas complementarias */}
      <div>
        <p className={heading}>Pruebas complementarias</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className={label}>Test de Héller (proteínas)</span>
            <FreeSelect value={value.heller} options={HELLER} onChange={v => set("heller", v)} disabled={locked} />
          </div>
          <div>
            <span className={label}>Anillo de Héller (bilirrubina)</span>
            <FreeSelect value={value.anilloHeller} options={ANILLO_HELLER} onChange={v => set("anilloHeller", v)} disabled={locked} />
          </div>
          <div className="sm:col-span-2 border border-black/10 bg-white px-3 py-2.5">
            <span className={label}>Ratio proteína / creatinina (UPC)</span>
            <p className="font-sans text-sm text-ink">
              {upc === null
                ? <span className="text-ink-2 text-xs">Se calcula al tener proteínas y creatinina urinaria.</span>
                : <><strong>{upc.toFixed(2)}</strong> · {upcInterpretacion(upc, config.upc[sp])}</>}
            </p>
            <div className="mt-2 max-w-xs">
              <span className={label}>Proteína urinaria por otro método (mg/dL, opcional)</span>
              <input type="number" step="any" min={0} value={value.proteinaMgDl} onChange={e => set("proteinaMgDl", e.target.value)} disabled={locked} placeholder="Si se deja vacío, sale de la tirilla" className={input} />
            </div>
          </div>
        </div>
      </div>

      {/* Sedimento urinario */}
      <div>
        <p className={heading}>Sedimento urinario</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 sm:max-w-xs">
            <span className={label}>Cantidad de sedimento</span>
            <FreeSelect value={sed.cantidad} options={CANTIDAD_SEDIMENTO} onChange={v => setSed("cantidad", v)} disabled={locked} />
          </div>
          {([
            ["leucocitos", "Leucocitos (AP)"], ["eritrocitos", "Eritrocitos (AP)"],
            ["transicionales", "Células epiteliales transicionales (AP)"], ["escamosas", "Células escamosas (AP)"],
          ] as const).map(([k, t]) => (
            <div key={k}>
              <span className={label}>{t}</span>
              <FreeSelect value={sed[k]} options={POR_CAMPO} onChange={v => setSed(k, v)} disabled={locked} />
            </div>
          ))}
          <div className="sm:col-span-2">
            <span className={label}>Bacterias</span>
            <div className="grid grid-cols-3 gap-2">
              <FreeSelect value={sed.bacterias.grado} options={BACTERIAS_GRADO} onChange={v => setSed("bacterias", { ...sed.bacterias, grado: v })} disabled={locked} />
              <FreeSelect value={sed.bacterias.tipo} options={BACTERIAS_TIPO} onChange={v => setSed("bacterias", { ...sed.bacterias, tipo: v })} disabled={locked || sed.bacterias.grado === "Negativo"} placeholder="Tipo" />
              <FreeSelect value={sed.bacterias.ubicacion} options={BACTERIAS_UBICACION} onChange={v => setSed("bacterias", { ...sed.bacterias, ubicacion: v })} disabled={locked || sed.bacterias.grado === "Negativo"} placeholder="Libres / fagocitadas" />
            </div>
            <p className="font-sans text-[10px] text-ink-2 mt-1">{LEYENDA_BACTERIAS}</p>
          </div>

          {/* Cilindros */}
          <div>
            <span className={label}>Cilindros</span>
            <label className="flex items-center gap-2 font-sans text-xs text-ink mb-1.5">
              <input type="checkbox" checked={sed.cilindros.ninguno} disabled={locked} onChange={e => setSed("cilindros", { ...sed.cilindros, ninguno: e.target.checked })} className="accent-salvia-700" />
              0 AP
            </label>
            {!sed.cilindros.ninguno && (
              <div className="space-y-1.5">
                {sed.cilindros.items.map((it, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <FreeSelect value={it.tipo} options={CILINDROS} onChange={v => setSed("cilindros", { ...sed.cilindros, items: sed.cilindros.items.map((x, j) => j === i ? { ...x, tipo: v } : x) })} disabled={locked} placeholder="Tipo" />
                    <input value={it.cantidad} onChange={e => setSed("cilindros", { ...sed.cilindros, items: sed.cilindros.items.map((x, j) => j === i ? { ...x, cantidad: e.target.value } : x) })} disabled={locked} placeholder="Cant. (ej. 0–2 AP)" className={`${input} w-32`} />
                    {!locked && <button type="button" onClick={() => setSed("cilindros", { ...sed.cilindros, items: sed.cilindros.items.filter((_, j) => j !== i) })} className="font-mono text-[9px] text-red-600">✕</button>}
                  </div>
                ))}
                {!locked && <button type="button" onClick={() => setSed("cilindros", { ...sed.cilindros, items: [...sed.cilindros.items, { tipo: "", cantidad: "" }] })} className={chip}>+ Agregar cilindro</button>}
              </div>
            )}
          </div>

          {/* Cristales */}
          <div>
            <span className={label}>Cristales</span>
            <label className="flex items-center gap-2 font-sans text-xs text-ink mb-1.5">
              <input type="checkbox" checked={sed.cristales.ninguno} disabled={locked} onChange={e => setSed("cristales", { ...sed.cristales, ninguno: e.target.checked })} className="accent-salvia-700" />
              No se observan
            </label>
            {!sed.cristales.ninguno && (
              <div className="space-y-1.5">
                {sed.cristales.items.map((it, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <FreeSelect value={it.tipo} options={CRISTALES} onChange={v => setSed("cristales", { ...sed.cristales, items: sed.cristales.items.map((x, j) => j === i ? { ...x, tipo: v } : x) })} disabled={locked} placeholder="Tipo" />
                    <FreeSelect value={it.cantidad} options={CRUCES} onChange={v => setSed("cristales", { ...sed.cristales, items: sed.cristales.items.map((x, j) => j === i ? { ...x, cantidad: v } : x) })} disabled={locked} placeholder="Cant." className="w-28 shrink-0" />
                    {!locked && <button type="button" onClick={() => setSed("cristales", { ...sed.cristales, items: sed.cristales.items.filter((_, j) => j !== i) })} className="font-mono text-[9px] text-red-600">✕</button>}
                  </div>
                ))}
                {!locked && <button type="button" onClick={() => setSed("cristales", { ...sed.cristales, items: [...sed.cristales.items, { tipo: "", cantidad: "" }] })} className={chip}>+ Agregar cristal</button>}
              </div>
            )}
          </div>

          <div className="sm:col-span-2">
            <span className={label}>Otros (espermatozoides, levaduras, lípidos, moco…)</span>
            <input value={sed.otros} onChange={e => setSed("otros", e.target.value)} disabled={locked} className={input} />
          </div>
        </div>
      </div>

      {/* Observaciones */}
      <div>
        <p className={heading}>Observaciones (opcional; si queda vacío no sale en el PDF)</p>
        <textarea rows={3} value={value.observaciones} onChange={e => set("observaciones", e.target.value)} disabled={locked} className={`${input} resize-y`} />
        <p className="font-sans text-[11px] text-ink-2 italic mt-1.5">Nota: {NOTA_ORINA}</p>
      </div>
    </div>
  )
}

const LABELS: Record<string, string> = {
  color: "Color", aspecto: "Aspecto", densidad: "Densidad (refractometría)", olor: "Olor", glucosa: "Glucosa",
  bilirrubina: "Bilirrubina", cetonas: "Cetonas", sangre: "Sangre", nitritos: "Nitritos", leucocitos: "Leucocitos",
  ph: "pH", proteinas: "Proteínas", urobilinogeno: "Urobilinógeno (mg/dL)", creatinina: "Creatinina urinaria (mg/dL)",
}
const labelOf = (p: string) => LABELS[p] ?? p
