# Catálogo de exámenes — Pets & Lab

Datos del laboratorio clínico veterinario, listos para consumir desde la aplicación web.
Generados desde el Excel maestro (`Pets & Lab - Catalogo de Examenes V6.xlsx`). **No editar a mano**: si cambia el
Excel, se vuelve a exportar.

## Contenido

| Archivo | Para qué sirve |
|---|---|
| `catalogo-examenes.json` | La fuente de datos. 66 exámenes completos. |
| `catalogo.types.ts` | Tipos de TypeScript que describen el JSON. |
| `calculos.ts` | Evaluador de los parámetros calculados y clasificador contra el rango. |
| `parametros.csv` | La misma información aplanada, para cargar a una base de datos. |

## Cifras

- **66 exámenes** en 10 categorías
- **330 parámetros de entrada** (los digita el laboratorista)
- **60 parámetros calculados** (se derivan de otros — nunca se digitan)
- **167 campos de texto libre** (descripciones, interpretaciones, hallazgos)

## Lo importante: los parámetros calculados

Cada parámetro tiene `tipo`. Los de tipo `calculado` **no se piden al usuario** — se
derivan. La expresión viene en `formula`, escrita con los `id` de los otros parámetros
de la misma hoja:

```json
{
  "id": "mcv_calculado",
  "nombre": "MCV  (calculado)",
  "unidad": "fL",
  "tipo": "calculado",
  "formula": "hematocrito*10/recuento_total_de_eritrocitos_rbc",
  "referencia": { "canino": { "min": 60, "max": 77 } }
}
```

Se incluye también `formula_excel` con la fórmula original, únicamente por trazabilidad
contra el Excel. **No la use para calcular**: son referencias de celda.

### Uso

```ts
import catalogo from "./catalogo-examenes.json";
import type { Catalogo } from "./catalogo.types";
import { calcularExamen, clasificar } from "./calculos";

const cat = catalogo as Catalogo;
const hemograma = cat.examenes.find((e) => e.numero === 1)!;

const resultado = calcularExamen(hemograma, {
  recuento_total_de_eritrocitos_rbc: 6.0,
  hemoglobina: 15.0,
  hematocrito: 45.0,
});
// resultado.mcv_calculado  === 75
// resultado.mch_calculado  === 25
// resultado.mchc_calculado === 33.33
```

## Estructura

```
Examen
 ├─ numero, nombre, categoria, especie, plantilla_origen
 ├─ datos_paciente[]        ← campos de cabecera (código, nombre, especie, ...)
 └─ secciones[]
     ├─ titulo
     ├─ parametros[]        ← filas con unidad y rangos de referencia
     └─ campos[]            ← texto libre, con opciones sugeridas
```

### Rangos de referencia

`referencia` trae una clave por especie. Puede venir `null` cuando el examen no define
rango para esa especie, y los valores pueden ser texto en vez de número cuando el
laboratorio reporta cualitativo (`"Mayor 60"`, `"RAROS"`, `"Negativo"`). Valide el tipo
antes de comparar — `clasificar()` en `calculos.ts` ya lo hace.

## Categorías

| Categoría | Exámenes |
|---|---|
| QUÍMICA SANGUÍNEA | 20 |
| HEMATOLOGÍA | 11 |
| CITOLOGÍAS | 8 |
| PERFILES QUÍMICA SANGUÍNEA | 7 |
| ENDOCRINOLOGÍA | 7 |
| INMUNOLOGÍA | 6 |
| COPROLOGÍA | 2 |
| UROANÁLISIS | 2 |
| CITOLOGÍAS DE PIEL | 2 |
| GASES | 1 |

## Al regenerar

El script de exportación lee el Excel y reconstruye estos archivos. Si el doctor cambia
un rango o agrega un examen, se corre otra vez y se reemplaza la carpeta completa.
