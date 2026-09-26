// Tipos del catálogo de exámenes de Pets & Lab
// Generado desde el Excel maestro. No editar a mano.

export type Especie = "canino" | "felino";
export type TipoParametro = "entrada" | "calculado";

export interface Rango { min: number | string | null; max: number | string | null; }

export interface Parametro {
  id: string;
  nombre: string;
  unidad: string | null;
  tipo: TipoParametro;
  /** Expresión con los id de otros parámetros de la misma hoja. Solo si tipo === "calculado". */
  formula?: string;
  /** Fórmula original de Excel, por trazabilidad. */
  formula_excel?: string;
  referencia?: Partial<Record<Especie, Rango | null>> | null;
  guia?: string;
}

export interface CampoTexto {
  id: string;
  etiqueta: string;
  tipo: "texto" | "calculado";
  /** Opciones sugeridas, separadas por " / ". */
  opciones?: string;
}

export interface Seccion {
  titulo: string;
  subtitulos?: string[];
  parametros?: Parametro[];
  campos?: CampoTexto[];
}

export interface Examen {
  numero: number;
  nombre: string;
  categoria: string;
  especie: string;
  plantilla_origen: string;
  datos_paciente: string[];
  secciones: Seccion[];
}

export interface Catalogo {
  laboratorio: string;
  version: string;
  total_examenes: number;
  examenes: Examen[];
}
