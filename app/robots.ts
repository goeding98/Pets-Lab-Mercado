import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // LIMS, API y áreas con sesión: no indexar
      disallow: ["/api/", "/dashboard", "/muestras", "/clientes", "/caja", "/inventario", "/usuarios",
        "/promociones", "/rangos", "/portal-vet/dashboard", "/portal-vet/nueva", "/login", "/register"],
    },
    sitemap: "https://www.petslab.com.co/sitemap.xml",
  }
}
