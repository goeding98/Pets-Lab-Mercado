// Evalúa los parámetros calculados de un examen.
// Las fórmulas del catálogo usan los id de los otros parámetros de la misma hoja.
import type { Examen, Parametro } from "./catalogo.types";

export type Valores = Record<string, number | null>;

/** Devuelve los parámetros calculados de un examen, en orden de dependencia. */
export function parametrosCalculados(examen: Examen): Parametro[] {
  return examen.secciones
    .flatMap((s) => s.parametros ?? [])
    .filter((p) => p.tipo === "calculado" && p.formula);
}

/**
 * Calcula un valor a partir de su fórmula.
 * Devuelve null si falta algún dato de entrada o si el resultado no es finito.
 */
export function evaluar(formula: string, valores: Valores): number | null {
  const ids = [...formula.matchAll(/[a-z_][a-z0-9_]*/g)].map((m) => m[0]);
  for (const id of ids) {
    const v = valores[id];
    if (v === undefined || v === null || Number.isNaN(v)) return null;
  }
  let expr = formula;
  for (const id of [...new Set(ids)].sort((a, b) => b.length - a.length)) {
    expr = expr.replaceAll(id, String(valores[id]));
  }
  if (!/^[0-9+\-*/().\s]+$/.test(expr)) return null;   // nada raro se evalúa
  try {
    const r = Function(`"use strict"; return (${expr});`)() as number;
    return Number.isFinite(r) ? Math.round(r * 100) / 100 : null;
  } catch {
    return null;
  }
}

/** Resuelve todos los calculados de un examen; repite hasta que no haya cambios. */
export function calcularExamen(examen: Examen, entradas: Valores): Valores {
  const out: Valores = { ...entradas };
  const calc = parametrosCalculados(examen);
  for (let i = 0; i < calc.length + 1; i++) {
    let cambio = false;
    for (const p of calc) {
      if (out[p.id] != null) continue;
      const v = evaluar(p.formula!, out);
      if (v !== null) { out[p.id] = v; cambio = true; }
    }
    if (!cambio) break;
  }
  return out;
}

/** "bajo" | "normal" | "alto" | null según el rango de la especie. */
export function clasificar(p: Parametro, valor: number, especie: "canino" | "felino") {
  const r = p.referencia?.[especie];
  if (!r) return null;
  const min = typeof r.min === "number" ? r.min : null;
  const max = typeof r.max === "number" ? r.max : null;
  if (min !== null && valor < min) return "bajo";
  if (max !== null && valor > max) return "alto";
  return min !== null || max !== null ? "normal" : null;
}
