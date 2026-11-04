// Fecha y hora de registro de una muestra/solicitud, siempre en hora de Colombia (el servidor de Vercel corre en UTC:
// sin timeZone, una muestra de las 8 pm salía con la fecha del día siguiente). Los espacios especiales que pone el
// formato ("3:25 p. m.") se cambian por espacios normales: la fuente del PDF (Helvetica) no los tiene.
const TZ = "America/Bogota"
const plain = (s: string) => s.replace(/[  ]/g, " ")

// "4/11/2026, 3:25 p. m."
export const formatDateTime = (d: Date | string) =>
  plain(new Date(d).toLocaleString("es-CO", { timeZone: TZ, day: "numeric", month: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }))

// "4 de noviembre de 2026, 3:25 p. m."
export const formatLongDateTime = (d: Date | string) =>
  plain(new Date(d).toLocaleString("es-CO", { timeZone: TZ, day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" }))
