# Pets & Lab — LIMS + sitio web

Sistema de laboratorio veterinario para Pets & Lab (área de diagnóstico de la clínica
Pets & Pets, Cali). Next.js 14 (App Router) + Prisma + PostgreSQL (Supabase) + NextAuth +
Tailwind. Desplegado en Vercel, dominio `petslab.com.co`.

## Estructura de rutas

- `app/(web)/` — sitio público de marketing (Inicio, Servicios, Veterinarios, Nosotros,
  Contacto) + **Portal Vet** (`app/(web)/portal-vet/`, botón "Portal Vet" del `Nav`) para
  clínicas: registro público (crea `Clinic` + usuario `CLINIC` que entra con su correo). Las clínicas
  creadas por el personal en `/clientes` también entran con su correo (obligatorio al crearlas) y la clave
  inicial `lib/portalAccount.ts: DEFAULT_PORTAL_PASSWORD` (123456789); la ficha de la clínica muestra el
  usuario y permite restablecer la clave. Las cuentas antiguas sin correo (`@portal.petslab`) entran con el
  nombre de la clínica,
  lista de exámenes por paciente y "Nueva solicitud". `/resultados` solo redirige ahí.
- Sedes (`ClinicBranch`): una clínica = una cuenta/NIT con una o varias sedes (dirección). El registro
  del Portal Vet crea la sede principal con la dirección (+ sedes extra opcionales); la clínica
  las administra en `/portal-vet/sedes` y el staff en `/clientes/[id]` (`components/BranchManager.tsx`,
  `actions/branches.ts`). Cada `Order` tiene `branchId`: si la clínica tiene sedes es obligatoria y
  debe ser suya (`lib/orders.ts: resolveBranch`). La sede sale en Muestras, Panel, Caja, el Portal
  (con filtro por sede) y el PDF. Un NIT ya registrado no puede crear otra cuenta: agrega una sede.
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
  ninguno tiene órdenes). La página pública `/servicios` lee los exámenes activos de la base en
  cada visita (no hay lista fija que mantener). Ojo: ninguna página puede consultar la base en el
  build (prerender estático) — el build de Vercel falla; usar `dynamic = "force-dynamic"`. `ExamTemplate.description` guarda el "Incluye" y se muestra en `OrderForm`. El "Hemograma Simple /
  Proteínas Plasmáticas" es exactamente el Completo sin reticulocitos (reticulocitos: "% corregido",
  canino 0 – 1.5, felino 0 – 1); si cambia el Completo, `scripts/unificar-hemogramas.ts` los vuelve a
  igualar (y ajusta los reticulocitos de los perfiles). Hay un
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
- Pacientes (`app/(lab)/pacientes/`, permiso `muestras.ver`): no hay tabla Patient; se listan agrupando las
  órdenes por paciente + especie + tutor + clínica (datos de la más reciente). Los datos se corrigen por
  muestra con "Editar datos" (`actions/orderInfo.ts`, `OrderInfoEditor.tsx`, permiso `muestras.crear`):
  paciente, especie, raza, edad, sexo, tutor, clínica, sede y veterinario; anota antes → después en
  `Order.notes`. No deja cambiar a una clínica que no pueda pedir sus exámenes (personalizados).
- Eliminar una muestra (`actions/deleteOrder.ts`, `muestras/[id]/DeleteOrderButton.tsx`, permiso `muestras.eliminar`:
  solo ADMIN): diálogo con motivo obligatorio (≥10 caracteres). Antes de borrar se guarda `DeletedOrder` (quién,
  cuándo, por qué, totales y `snapshot` con exámenes y resultados); se ve en `/muestras/eliminadas`. Borra en cascada
  exámenes/resultados/fotos y sus archivos del Blob; el inventario ya consumido no se devuelve.
- Corregir los exámenes de una muestra (`actions/orderExams.ts`, `muestras/[id]/ExamChanger.tsx`, permiso
  `muestras.crear`, solo personal): cambiar un examen **pendiente** por otro (mismo `OrderExam`, conserva
  comentarios y fotos), quitarlo (si quedan otros) o agregar uno. Precio = el de lista del nuevo, descuento
  0; `amountPaid` se conserva (el módulo de pago recalcula el saldo). Opciones con `catalogWhere` de la
  clínica de la orden. Cada cambio se anota en `Order.notes` con fecha y usuario. Completados no se cambian.
- Exámenes personalizados (`app/(lab)/personalizados/`, `actions/customExams.ts` + `lib/customExam.ts`,
  permiso `personalizados`: ADMIN, STAFF y COMERCIAL): como una promoción (`isPromotion = true`, copia de secciones con `composeSections`,
  `PromotionComponent`; precio y eliminar con las acciones de promociones) pero con nombre, categoría
  (`area`) y precio propios, `isCustom = true` y visibles solo para sus clínicas (`ExamTemplate.clients`).
  Componentes: exámenes simples (no Perfiles, promociones ni personalizados). Toda consulta de exámenes
  para órdenes debe usar `lib/catalog.ts: catalogWhere(clinicId)` / `assertOrderableTemplates`; en
  /muestras/nueva `OrderForm` los muestra solo al elegir su clínica; nunca en /servicios ni /promociones.
  Las secciones copiadas se llaman "<examen> — <sección>": `isDescriptiveSection` las evalúa como en el
  examen original.
- Un `OrderExam` se completa de dos formas: (a) capturando resultados campo por campo en
  el formulario (`app/(lab)/muestras/[id]/ExamResultForm.tsx`), o (b) subiendo un PDF ya
  hecho externamente. El botón "PDF" de la orden genera un reporte combinado que fusiona
  (con `pdf-lib`) el reporte generado de los exámenes con resultados capturados + las
  páginas de cada PDF subido (`lib/reportPdf.ts`, usado por ambas rutas de PDF). Un examen puede
  tener las dos cosas (se puede subir PDF también a uno ya completado): salen sus resultados y
  además las páginas del PDF. El PDF va **directo del navegador a Blob** (`@vercel/blob/client`
  `upload`, token en `api/upload/[examId]/token`, hasta 50 MB) y luego se registra con POST JSON
  `{url, name}` a `api/upload/[examId]` (verifica con `head` que sea un PDF de
  `uploads/<examId>/`). No volver a mandar el archivo por la función: Vercel corta a 4.5 MB.
  Eliminar el PDF deja el examen completado si tiene resultados capturados; si no, vuelve a pendiente.
- Borrador (`actions/orders.ts: saveExamDraft`, botón "Guardar borrador"): guarda `ExamResult`/`structured` de un
  examen **pendiente** sin completarlo (sin inventario, sin validaciones de cierre; RECIBIDA → EN_PROCESO). Un
  borrador nunca sale en un PDF (`lib/reportPdf.ts` vacía los pendientes); se descarta si el examen se cambia por
  otro o se resuelve subiendo un PDF. Pestañas: `muestras/[id]/ExamTabs.tsx` (un examen por pestaña, todos montados
  para no perder lo digitado) y `components/OpenSamplesBar.tsx` en el layout del LIMS (muestras abiertas en
  localStorage; avisa si hay cambios sin guardar, `lib/unsavedWork.ts`, al usar un enlace interno o cerrar).
- Secciones de texto libre (Morfología y Observaciones del hemograma, Hemoparásitos/gota gruesa,
  Extendido de Sangre Periférica, Citología de Piel, Citología Conjuntival, Citología de Masa (y Masa Adicional), Conclusión de Citología de Líquidos, secciones "Interpretación", Citología de Efusión, Test de Héller y Wright de orina y heces, Observaciones del Raspado de Piel — también dentro de los perfiles) se muestran
  solo como Parámetro + Descripción, con filas altas, en el formulario y en el PDF. La lista vive en
  `lib/sections.ts: isDescriptiveSection` (por nombre de sección o de examen); agregar ahí las nuevas.
- Rangos de referencia (`app/(lab)/rangos/`, `actions/ranges.ts`, permiso `rangos`: solo ADMIN —
  el jefe médico Marcelo Valencia es ADMIN): lista los exámenes maestros (activos, no perfiles ni
  promociones) y edita refCanine/refFeline. Cada parámetro copiado (perfiles, promociones, Hemograma
  Simple, Bilirrubinas Diferenciadas, Electrolitos, TPT+TP, PCR combinados) tiene
  `ExamField.sourceFieldId` → su parámetro maestro; guardar en el maestro actualiza todas las copias.
  Las copias no se editan aparte. Vínculos creados con `scripts/vincular-rangos.ts` (idempotente;
  correrlo de nuevo si se crea un perfil/examen derivado fuera de Promociones). `composeSections`
  liga solas las promociones nuevas. "Hemograma 0 - 2 Meses", "Hemograma 2.5 - 3 Meses" y "Hemograma 4 - 6 Meses" son maestros
  aparte (copia del Completo, rangos propios). Cambiar un rango no recalcula el "fuera de rango" de
  resultados ya guardados.
- Coprológico = resultado estructurado, no por campos (`lib/coprologico.ts`, formulario
  `components/CoproForm.tsx`, PDF `CoproPdf` en `components/PdfReport.tsx`): macroscópico con selectores
  + foto de la muestra (`ExamPhoto.role = "COPRO_MACRO"`, una sola, circular en el PDF), tabla
  "Examen microscópico" de 2 columnas (microbiota, glóbulos rojos, restos, leucocitos, levaduras,
  protozoarios, otros con *cursiva*, técnica de flotación = parásito + HPG), técnica, nota fija y
  observaciones. Se guarda en `OrderExam.structured.copro`. El examen y los perfiles que lo incluyen
  tienen una sección marcador "Coprológico" sin campos (`scripts/coprologico-estructurado.ts`).
  Coproscópico = exactamente lo mismo + tabla "Coproscópico" (pH 4–9, almidones, grasa, sangre oculta,
  Wright/Gram con frase automática) en `structured.coproscopico` (`components/CoproscopicoFields.tsx`);
  el Coprológico no lleva esa tabla. Sección marcador "Coproscópico"
  (`scripts/coproscopico-estructurado.ts`; la de "Sangre Oculta en Heces" se llama "Sangre Oculta").
- Parcial de Orina = resultado estructurado (`lib/orina.ts`, `components/OrinaForm.tsx`, `OrinaPdf` en
  `PdfReport.tsx`), en `structured.orina`; sección marcador "Parcial de Orina" en el examen y en los
  perfiles Renal Completo, Diabético, Geriátrico e Integral (`scripts/orina-estructurado.ts`). Método
  de recolección y tirilla obligatorios. Las listas son sugerencias: se puede digitar otro valor
  (`FreeSelect` de `CoproForm.tsx`; `readOrina` acepta cualquier texto). Referencias por especie (texto + qué es normal / mín-máx, que
  define la negrita) y cortes del UPC en `LabSetting` "orina" (`lib/settings.ts: getOrinaConfig`),
  editables en /rangos; no fijarlos en el código. UPC = proteína (tirilla, o medida aparte) /
  creatinina urinaria. Reactivos = items de Inventario con lote y vencimiento; con lote vencido no se
  valida (chequeo en cliente y en `saveExamResults`, con los datos del inventario).
- Tablas de referencia fijas al final de un examen (ej. Ácidos Biliares: preprandial/postprandial
  por especie; SDMA: Normal / Elevado / Probabilidad de enfermedad renal + nota de hemólisis), en formulario y
  PDF: `lib/referenceTables.ts`, por nombre de examen (con `note` opcional). SDMA creado con `scripts/agregar-sdma.ts`.
- Al final de cada examen de una orden hay "Comentarios y fotos" (`ExamNotes.tsx`):
  `OrderExam.comments` y `ExamPhoto` (blob privado, subida en `api/upload/[examId]/photos`, se
  sirve por `api/photos/[photoId]`). Se pueden editar aunque el examen esté completado. El
  navegador comprime las fotos a JPEG ≤1600 px antes de subirlas (límite de 4.5 MB de Vercel).
  Salen en el PDF debajo de los resultados, también para exámenes resueltos con PDF subido.
  El PDF cierra siempre con la firma del Director de Laboratorio (Dr. Marcelo Valencia Vargas,
  imagen `public/firma-marcelo-valencia.png`, en `components/PdfReport.tsx`), no la de quien procesó; debajo
  va siempre la del microbiólogo Anderson Yemin Angulo Valencia (`public/firma-anderson-angulo.png`).
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
- Pago y entrega del resultado (`lib/payment.ts: orderPayment`, fuente única): la clínica solo ve el
  resultado (Portal Vet, `api/pdf/[orderId]`, `api/pdf/exam/[examId]`, `api/photos` → 402 si no) cuando la
  orden está **liberada**: algún pago (parcial basta), nada que cobrar (total 0) o clínica `noCharge`
  ("cliente sin cobro": solo Pets & Pets; solo ADMIN lo cambia en /clientes). El staff ve todo siempre.
  Módulo de pago arriba en cada muestra (`PaymentModule.tsx`): total/pagado/saldo y casilla "Pagado"
  (`actions/payments.ts: setOrderPaid`, permiso `pagos` = todo el personal) que pone `amountPaid` = neto
  en todos sus exámenes (o 0 al desmarcar) → el resultado se libera solo. "Ya pagó" también al registrar
  la muestra (`OrderForm paymentOption`, solo staff — excepción a "mismo formulario para ambos"). Al
  guardar/subir PDF en una orden sin pago sale la alerta de resultado retenido; en /muestras, "Retenido".
  Las órdenes anteriores al cambio se marcaron pagadas con `scripts/pagos-iniciales.ts`.
- Enviar resultado por WhatsApp (`muestras/[id]/WhatsAppButton.tsx`, junto a "PDF" de la orden y "PDF
  individual"): abre `wa.me/<número>` con un mensaje y un enlace firmado al PDF `/r/<token>` (`lib/shareLink.ts`,
  HMAC con NEXTAUTH_SECRET, vence en 60 días, sin sesión; `app/r/[token]/route.ts` vuelve a aplicar la regla de
  pago). WhatsApp no adjunta archivos desde un enlace, por eso va el link. Número = teléfono de la sede o de la
  clínica (`lib/whatsapp.ts` agrega el 57); editable al enviar y se puede guardar en la clínica. El WhatsApp es
  obligatorio en el registro del Portal Vet y al crear clínicas. Bloqueado si la orden está retenida por pago.
- Dashboard financiero (`app/(lab)/finanzas/`, `lib/finance.ts`, CSV en `/finanzas/csv`): solo Michel y Guillermo
  (`lib/permissions.ts: FINANCE_EMAILS` + `canSeeFinance`, revisado en middleware, menú y página; Marcelo es ADMIN
  pero no lo ve). Venta = precio neto de Caja el día que se registra la muestra (Bogotá); recaudado = `amountPaid`
  (no hay fecha de pago); Pets & Pets (noCharge) no suma a ventas, va aparte; procesados = `completedAt`. Compara
  contra el período anterior de igual duración. Gráficos SVG propios (`finanzas/Charts.tsx`), una serie por gráfico.
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
