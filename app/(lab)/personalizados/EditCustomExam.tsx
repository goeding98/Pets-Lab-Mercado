"use client"
import { useState } from "react"
import NewCustomExamForm, { type CustomExamEdit } from "./NewCustomExamForm"

// Botón "Editar" de un personalizado: abre el mismo formulario de creación ya lleno, debajo de la fila
export default function EditCustomExam({ edit, ...props }: Omit<Parameters<typeof NewCustomExamForm>[0], "edit" | "onClose"> & { edit: CustomExamEdit }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="font-mono text-[9px] tracking-[0.15em] uppercase px-3 py-1.5 border border-salvia-700 text-salvia-700 hover:bg-salvia-700 hover:text-bone transition-colors"
      >
        {open ? "Cerrar" : "Editar"}
      </button>
      {open && (
        <div className="basis-full">
          <NewCustomExamForm {...props} edit={edit} onClose={() => setOpen(false)} />
        </div>
      )}
    </>
  )
}
