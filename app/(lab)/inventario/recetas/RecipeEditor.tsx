"use client"
import { useState, useTransition } from "react"
import { saveRecipe } from "@/actions/inventory"

type InventoryItemOption = { id: string; name: string; unit: string }
type Row = { key: number; itemId: string; quantity: string }

let rowKeySeq = 0

export default function RecipeEditor({
  templateId,
  templateName,
  items,
  initialRecipe,
}: {
  templateId: string
  templateName: string
  items: InventoryItemOption[]
  initialRecipe: { itemId: string; quantity: number }[]
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    initialRecipe.length > 0
      ? initialRecipe.map(r => ({ key: rowKeySeq++, itemId: r.itemId, quantity: String(r.quantity) }))
      : []
  )
  const [pending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  const itemsById = Object.fromEntries(items.map(i => [i.id, i]))

  function addRow() {
    setRows(r => [...r, { key: rowKeySeq++, itemId: "", quantity: "" }])
  }

  function updateRow(key: number, field: "itemId" | "quantity", value: string) {
    setRows(r => r.map(row => (row.key === key ? { ...row, [field]: value } : row)))
    setSaved(false)
  }

  function removeRow(key: number) {
    setRows(r => r.filter(row => row.key !== key))
    setSaved(false)
  }

  function handleSave() {
    const payload = rows
      .filter(r => r.itemId && Number(r.quantity) > 0)
      .map(r => ({ itemId: r.itemId, quantity: Number(r.quantity) }))

    startTransition(async () => {
      await saveRecipe(templateId, payload)
      setSaved(true)
    })
  }

  return (
    <div className="border border-black/10 p-5">
      <p className="font-serif text-base font-medium tracking-[-0.01em] mb-3">{templateName}</p>

      {rows.length === 0 && (
        <p className="font-sans text-xs text-ink-2 mb-3">Sin receta definida — este examen no descuenta inventario.</p>
      )}

      <div className="space-y-2 mb-3">
        {rows.map(row => (
          <div key={row.key} className="flex items-center gap-2">
            <select
              value={row.itemId}
              onChange={e => updateRow(row.key, "itemId", e.target.value)}
              className="flex-1 border border-black/20 bg-white px-2.5 py-1.5 text-xs font-sans focus:outline-salvia-700"
            >
              <option value="">Seleccionar insumo…</option>
              {items.map(i => (
                <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
              ))}
            </select>
            <input
              type="number"
              step="any"
              min="0"
              value={row.quantity}
              onChange={e => updateRow(row.key, "quantity", e.target.value)}
              placeholder="Cant."
              className="w-24 border border-black/20 bg-white px-2.5 py-1.5 text-xs font-mono focus:outline-salvia-700"
            />
            <span className="font-mono text-[10px] text-ink-2 w-16">
              {row.itemId ? itemsById[row.itemId]?.unit ?? "" : ""}
            </span>
            <button
              onClick={() => removeRow(row.key)}
              className="font-mono text-[9px] tracking-[0.15em] uppercase text-red-600 hover:underline px-1"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={addRow}
          className="font-mono text-[9px] tracking-[0.18em] uppercase text-salvia-700 hover:underline"
        >
          + Agregar insumo
        </button>
        <button
          onClick={handleSave}
          disabled={pending}
          className="bg-salvia-700 text-bone font-mono text-[9px] tracking-[0.18em] uppercase px-4 py-2 hover:bg-salvia-800 transition-colors disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Guardar receta"}
        </button>
        {saved && <span className="font-mono text-[9px] tracking-[0.15em] text-salvia-700 uppercase">✓ Guardado</span>}
      </div>
    </div>
  )
}
