export type ServiceColor = "salvia" | "teal"

export type Service = {
  area: string
  id: string
  colorHex: string
  items: string[]
  time: string
  sample: string
}

export const SERVICES: Service[] = [
  {
    area: "Hematología",
    id: "hematologia",
    colorHex: "#5e7064",
    items: [
      "Hemograma completo",
      "Hemograma control hospitalario",
      "Recuento de plaquetas",
      "Recuento de reticulocitos",
      "Hematocrito",
      "Test rápido FIV/FeLV",
    ],
    time: "Mismo día",
    sample: "Sangre · 1 mL EDTA",
  },
  {
    area: "Bioquímica",
    id: "bioquimica",
    colorHex: "#2a7780",
    items: [
      "Perfil básico",
      "Perfil prequirúrgico",
      "Perfil hepático",
      "Perfil renal + electrolitos",
      "Perfil geriátrico",
      "Perfil diabético",
      "Perfil gato adulto",
    ],
    time: "24 horas",
    sample: "Sangre · 2 mL tubo seco",
  },
  {
    area: "Citología",
    id: "citologia",
    colorHex: "#5e7064",
    items: [
      "Citología diagnóstica",
      "Citología vaginal reproductiva",
      "Citología de oído",
      "Coloración Gram",
      "Coloración Wright",
    ],
    time: "48 horas",
    sample: "Placa fijada",
  },
  {
    area: "Uroanálisis",
    id: "urinario",
    colorHex: "#2a7780",
    items: ["Parcial de orina (uroanálisis)", "Relación UPC"],
    time: "Mismo día",
    sample: "Orina fresca · 5 mL",
  },
  {
    area: "Coprología",
    id: "coprologia",
    colorHex: "#5e7064",
    items: [
      "Coprológico (flotación + directo)",
      "Coprológico seriado (3 muestras)",
      "Coproscópico",
    ],
    time: "24–48 horas",
    sample: "Heces frescas",
  },
  {
    area: "Otros",
    id: "otros",
    colorHex: "#2a7780",
    items: ["Perfiles personalizados", "Pruebas externas referenciadas"],
    time: "A convenir",
    sample: "Según prueba",
  },
]
