# Pets & Lab — LIMS + sitio web

Sistema de laboratorio veterinario para Pets & Lab (área de diagnóstico de la clínica
Pets & Pets, Cali). Next.js 14 (App Router) + Prisma + PostgreSQL (Supabase) + NextAuth +
Tailwind. Desplegado en Vercel, dominio `petslab.com.co`.

## Estructura de rutas

- `app/(web)/` — sitio público de marketing (Inicio, Servicios, Veterinarios, Nosotros,
  Contacto) + **Portal Vet** (`app/(web)/portal-vet/`, botón "Portal Vet" del `Nav`) para
  clínicas: registro público (crea `Clinic` + usuario `CLINIC` que entra con su correo; las
  clínicas creadas por el staff en `/clientes` siguen entrando con el nombre de la clínica),
  lista de exámenes por paciente y "Nueva solicitud". `/resultados` solo redirige ahí.
- Solicitudes del portal: crean un `Order` con `source = "PORTAL"` y `status = "SOLICITADA"`
  (el lab aún no tiene la muestra); el staff la ve en `/muestras` y la pasa a `RECIBIDA`. El
  formulario de ingreso es el mismo componente para staff y clínicas
  (`components/OrderForm.tsx`) — si se agrega un campo, se agrega para ambos.
- `app/(lab)/` — LIMS interno para el staff del laboratorio (Panel/Dashboard, Muestras,
  Clientes, Usuarios). Requiere sesión de staff (no CLINIC).
- `app/(auth)/` — login y registro.
- `middleware.ts` — controla el acceso por rol: `CLINIC` va a `/portal-vet/dashboard`; el
  personal interno entra a las rutas de `(lab)` según sus permisos. Revisar aquí antes de
  tocar rutas protegidas.
- `lib/permissions.ts` — fuente única de permisos por rol (`can(role, permiso)`), usada por
  middleware, `Sidebar`, páginas y server actions. Roles internos: `ADMIN` (todo),
  `STAFF` = microbiólogo (todo menos Usuarios), `COMERCIAL` (Panel, Muestras en consulta,
  Nueva muestra, Clientes) y `DOMICILIARIO` (Muestras en consulta y Nueva muestra). Al
  agregar una ruta o acción nueva, mapearla ahí; no volver al chequeo `role !== "CLINIC"`.

## Datos y dominio del negocio

- `prisma/schema.prisma` — modelos: `User` (roles ADMIN/STAFF/CLINIC), `Clinic`, `Order`
  (una muestra/orden con paciente, dueño, clínica), `OrderExam` (examen dentro de una
  orden), `ExamTemplate`/`ExamSection`/`ExamField` (catálogo de exámenes y sus campos de
  resultado con rangos de referencia canino/felino), `ExamResult` (valor capturado por
  campo).
- Catálogo de exámenes: la fuente de verdad comercial es **LISTA_DE_PRECIOS_PETS_AND_LAB_v3.xlsx**
  (hoja "Claude", 102 exámenes con área, muestra, entrega y precio). Se aplicó con
  `scripts/update-catalogo-precios-v3.ts` (concilia en su lugar: renombra/ajusta campos de los que
  siguen, retira con `active = false` los que ya no están, crea los nuevos y los 21 perfiles; todo
  en una transacción, sin `--apply` es un ensayo que revierte). Los perfiles (área "Perfiles") se
  arman copiando los campos de sus exámenes componentes con `lib/composeTemplate.ts` (lo mismo que
  usan las Promociones); el "Hemograma" de los perfiles es el "Hemograma Completo con Recuento de
  Reticulocitos". Si cambia un examen componente, `--rebuild-perfiles` rearma los perfiles (solo si
  ninguno tiene órdenes). La página pública `/servicios` lee los exámenes activos de la base (no
  hay lista fija que mantener). `ExamTemplate.description` guarda el "Incluye" y se muestra en `OrderForm`. Hay un
  solo hemograma para canino y felino (rangos de ambas especies en el mismo campo); el "fuera de
  rango" se evalúa con el rango de la especie de la orden. Exámenes nuevos sin rango de referencia
  en la base (hay que pedírselo al laboratorio): CK, Fructosamina, Ácidos Biliares, Creatininuria.
- `prisma/seed.ts` y `scripts/import-catalogo-v6.ts` están **desactualizados**: el catálogo v6 (66
  exámenes, de `catalogo-pets-lab/catalogo-examenes.json`) ya no coincide con la base.
  `import-catalogo-v6.ts` borra todo `ExamTemplate`/`Order` antes de re-importar —
  **destructivo**, no correrlo: se perderían los cambios de la lista v3, los perfiles y las
  órdenes. `ExamField.key` guarda el id del parámetro en el catálogo (ej.
  `hematocrito`); `ExamField.calcFormula` referencia esos `key`, no nombres. El evaluador
  general de fórmulas vive en `catalogo-pets-lab/calculos.ts` (`evaluar`) y lo usa
  `ExamResultForm.tsx` — no reescribir la lógica de evaluación ahí, importar de ese
  módulo. La carpeta `catalogo-pets-lab/` se regenera completa si el Excel maestro
  cambia; no editar sus archivos a mano. No asumas que `seed.ts` refleja el estado
  actual sin confirmarlo contra la base.
- Promociones (`app/(lab)/promociones/`, `actions/promotions.ts`, permiso `promociones`: ADMIN
  y COMERCIAL): una promoción es un `ExamTemplate` con `isPromotion = true` y área
  "Promociones", creado copiando secciones/campos/fórmulas y sumando la receta de los exámenes
  elegidos (`PromotionComponent` registra cuáles). Si dos componentes comparten un `key`, el
  repetido se renombra (`key__2`) porque las fórmulas se resuelven por `key` en todo el examen.
  Eliminar: se borra si no tiene órdenes; si ya se usó, `active = false` (retirada). Toda
  consulta de exámenes para órdenes nuevas debe filtrar `active: true`. Ojo: el importador del
  catálogo borra todos los `ExamTemplate`, promociones incluidas. `ExamTemplate.price` (opcional,
  hoy solo se edita en Promociones) se copia a `OrderExam.price` al crear la orden
  (`lib/orders.ts: examsWithListPrice`); después Caja lo edita por orden sin tocar el de lista.
- Un `OrderExam` se completa de dos formas: (a) capturando resultados campo por campo en
  el formulario (`app/(lab)/muestras/[id]/ExamResultForm.tsx`), o (b) subiendo un PDF ya
  hecho externamente. El botón "PDF" de la orden genera un reporte combinado que fusiona
  (con `pdf-lib`) el reporte generado de los exámenes con resultados capturados + las
  páginas de cada PDF subido (`lib/reportPdf.ts`, usado por ambas rutas de PDF).
- Al final de cada examen de una orden hay "Comentarios y fotos" (`ExamNotes.tsx`):
  `OrderExam.comments` y `ExamPhoto` (blob privado, subida en `api/upload/[examId]/photos`, se
  sirve por `api/photos/[photoId]`). Se pueden editar aunque el examen esté completado. El
  navegador comprime las fotos a JPEG ≤1600 px antes de subirlas (límite de 4.5 MB de Vercel).
  Salen en el PDF debajo de los resultados, también para exámenes resueltos con PDF subido.
  El PDF usa Helvetica: no admite caracteres como "▲", "⁶", "₂", "≥" — usar ASCII/Latin-1 en
  nombres, unidades y rangos.
- Caja (`app/(lab)/caja/`, `actions/billing.ts`, `lib/billing.ts`): cada `OrderExam` tiene
  `price`, `discountType` (VALOR | PORCENTAJE), `discountValue`, `paymentTerm` (CONTADO |
  CREDITO), `paymentMethod` (EFECTIVO | TRANSFERENCIA) y `amountPaid`. `/caja` lista todos
  los exámenes solo con su parte de cobro, editable en línea, con totales en vivo. El
  estado Pagado/Parcial/No pagado que se ve en `ExamResultForm.tsx` y en el listado de
  `/muestras` **no se guarda**: se calcula siempre en el momento con
  `lib/billing.ts: computeNetPrice` + `getPaymentStatus` (precio neto vs. `amountPaid`). No
  reintroduzcas un booleano `paid` manual — ya se quitó a propósito a favor de este cálculo.
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
