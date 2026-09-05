# Pets & Lab — LIMS + sitio web

Sistema de laboratorio veterinario para Pets & Lab (área de diagnóstico de la clínica
Pets & Pets, Cali). Next.js 14 (App Router) + Prisma + PostgreSQL (Supabase) + NextAuth +
Tailwind. Desplegado en Vercel, dominio `petslab.com.co`.

## Estructura de rutas

- `app/(web)/` — sitio público de marketing (Inicio, Servicios, Veterinarios, Nosotros,
  Contacto, portal de Resultados para clínicas).
- `app/(lab)/` — LIMS interno para el staff del laboratorio (Panel/Dashboard, Muestras,
  Clientes, Usuarios). Requiere sesión de staff (no CLINIC).
- `app/(auth)/` — login y registro.
- `middleware.ts` — controla el acceso por rol: `ADMIN`/`STAFF` van a `/dashboard` y rutas
  de `(lab)`; `CLINIC` va a `/resultados/dashboard`. Revisar aquí antes de tocar rutas
  protegidas.

## Datos y dominio del negocio

- `prisma/schema.prisma` — modelos: `User` (roles ADMIN/STAFF/CLINIC), `Clinic`, `Order`
  (una muestra/orden con paciente, dueño, clínica), `OrderExam` (examen dentro de una
  orden), `ExamTemplate`/`ExamSection`/`ExamField` (catálogo de exámenes y sus campos de
  resultado con rangos de referencia canino/felino), `ExamResult` (valor capturado por
  campo).
- `prisma/seed.ts` — catálogo de ejemplo de `ExamTemplate`. **Ojo:** este script borra
  TODAS las órdenes/resultados/usuarios antes de re-sembrar. El catálogo real en
  producción ya diverge de este archivo (se editó directo en la BD varias veces) — no
  asumas que `seed.ts` refleja el estado actual sin confirmarlo contra la base.
- Un `OrderExam` se completa de dos formas: (a) capturando resultados campo por campo en
  el formulario (`app/(lab)/muestras/[id]/ExamResultForm.tsx`), o (b) subiendo un PDF ya
  hecho externamente. El botón "PDF" de la orden genera un reporte combinado que fusiona
  (con `pdf-lib`) el reporte generado de los exámenes con resultados capturados + las
  páginas de cada PDF subido.
- `OrderExam.paid` marca si ese examen fue pagado (default `false`). Se alterna desde
  `ExamResultForm.tsx`; en el listado de `/muestras` se agrega por orden (Pagado/Parcial/No
  pagado).
- Inventario (`InventoryItem`, `RecipeItem`, `InventoryMovement`, rutas
  `app/(lab)/inventario/`): cada `ExamTemplate` puede tener una "receta" (`RecipeItem`) que
  define qué insumos y en qué cantidad consume. Al completarse un `OrderExam` (por
  cualquiera de las dos vías de arriba) se descuenta automáticamente el stock según la
  receta (`lib/inventory.ts: consumeInventoryForExam`, ejecutado dentro de la misma
  transacción que marca el examen como completado). Si se revierte un PDF subido (vuelve a
  PENDIENTE), el consumo se restaura (`restoreInventoryForExam`). `InventoryItem.unit` es
  texto libre (ML, GR, MG, unidades, etc.) para admitir cualquier presentación.

## Almacenamiento de archivos — usar SIEMPRE Vercel Blob, nunca fs local

Los PDFs subidos se guardan con `@vercel/blob` (`put`/`get`/`del`), store en modo
**privado** (contienen datos de pacientes/dueños). Ver `app/api/upload/[examId]/route.ts`
y `app/api/pdf/exam/[examId]/route.ts`. **Nunca** escribas a `fs`/`public/uploads` en una
ruta de API — el filesystem de Vercel es de solo lectura en producción y esas escrituras
fallan silenciosamente en el cliente (bug real que causó horas de "se queda subiendo").
Requiere la env var `BLOB_READ_WRITE_TOKEN` (se agrega sola al conectar un Blob store al
proyecto en Vercel).

## Base de datos — pooler en modo transacción, no sesión

`DATABASE_URL` debe apuntar al pooler de Supabase en **puerto 6543** con
`?pgbouncer=true&connection_limit=1`. El puerto 5432 (modo sesión, límite de 15
conexiones) se agota rápido con funciones serverless de Vercel y tira
`FATAL: max clients reached in session mode` — causó el error 500 del dashboard en
producción una vez. No lo cambies de vuelta a 5432.

## Comandos

```
npm run dev       # servidor de desarrollo
npm run build     # prisma generate && next build
npm run db:push   # aplicar schema.prisma a la BD (sin migraciones)
npm run db:seed   # sembrar catálogo de ejemplo — DESTRUCTIVO, ver arriba
npm run db:studio # Prisma Studio
```

### Gotcha de Windows: rutas con "&" rompen los shims .cmd de npm

Si el proyecto vive en una ruta con `&` (ej. `...\Pets & Lab\...`), los shims `.cmd` que
genera npm en `node_modules\.bin` (como `next.cmd`) truncan el path y fallan con
`Cannot find module '...\next\dist\bin\next'`. Si `npm run dev` falla así, usa `node`
directo contra el binario:

```
node "node_modules\next\dist\bin\next" dev
```

`npm install` normal sí funciona bien (el problema es solo con los shims ya generados).

### Gotcha de `db:push` colgado indefinidamente

`prisma db push` (y por lo tanto `npm run build` en frío tras cambiar el schema) se queda
colgado sin avanzar cuando `DATABASE_URL` apunta al pooler en modo transacción (puerto
6543): ese modo no soporta el advisory lock que Prisma usa para aplicar cambios de schema.
Solución: cambiar temporalmente el puerto de `DATABASE_URL` a **5432** (modo sesión, mismo
host y credenciales, sin `?pgbouncer=true&connection_limit=1`), correr `npx prisma db
push`, y devolver el `.env` a 6543 apenas termine. No lo dejes en 5432 — ver nota del
pooler arriba.

### Gotcha de OneDrive: error transitorio de webpack en globals.css

Si `next dev` tira `Error: UNKNOWN: unknown error, read ... globals.css` en la primera
compilación, es un problema intermitente de sincronización de OneDrive con el caché de
Next. Solución: borrar `.next` y reiniciar el servidor.

## Variables de entorno (`.env`, no versionado)

- `DATABASE_URL` — ver nota del pooler arriba.
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` — NextAuth.
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob (se inyecta sola en producción; en local hace
  falta si vas a probar subida de PDFs).

## Deploy

Push a `main` → Vercel despliega solo (`petslab.com.co`). No hay ambiente de staging.
