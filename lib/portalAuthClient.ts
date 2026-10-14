// Solo navegador. Inicio y cierre de sesión del Portal Vet contra /api/portal-auth (su propia sesión,
// separada de la del personal; next-auth/react solo habla con /api/auth).
const BASE = "/api/portal-auth"

async function csrf(): Promise<string> {
  const r = await fetch(`${BASE}/csrf`, { cache: "no-store" })
  return (await r.json()).csrfToken as string
}

export async function portalSignIn(login: string, password: string): Promise<boolean> {
  const r = await fetch(`${BASE}/callback/clinic`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1" },
    body: new URLSearchParams({ csrfToken: await csrf(), login, password, callbackUrl: `${location.origin}/portal-vet/dashboard`, json: "true" }),
  })
  const data = await r.json().catch(() => ({}))
  const url = typeof data.url === "string" ? data.url : ""
  return r.ok && !!url && !new URL(url, location.origin).searchParams.get("error")
}

export async function portalSignOut() {
  await fetch(`${BASE}/signout`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1" },
    body: new URLSearchParams({ csrfToken: await csrf(), callbackUrl: `${location.origin}/portal-vet`, json: "true" }),
  })
  location.href = "/portal-vet"
}
