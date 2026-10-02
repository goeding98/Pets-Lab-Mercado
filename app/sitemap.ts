import type { MetadataRoute } from "next"

const BASE = "https://www.petslab.com.co"

// Solo el sitio público; el LIMS y el Portal Vet requieren sesión
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/servicios", "/veterinarios", "/nosotros", "/contacto", "/portal-vet"].map(path => ({
    url: `${BASE}${path}`,
    changeFrequency: path === "/servicios" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }))
}
