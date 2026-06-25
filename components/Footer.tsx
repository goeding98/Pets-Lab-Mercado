import Link from "next/link"
import Image from "next/image"
import { SITE } from "@/lib/site-config"

export default function Footer() {
  return (
    <footer className="bg-salvia-700 text-bone">
      <div className="max-w-wrap mx-auto px-6 lg:px-10 pt-12 pb-7 md:pt-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pb-8 border-b border-bone/20">
          <div className="col-span-2 md:col-span-1">
            <Image
              src="/logos/pets-lab-cream.png"
              alt="Pets & Lab"
              width={140}
              height={42}
              className="h-10 w-auto"
            />
            <p className="font-sans text-xs opacity-80 mt-4 leading-relaxed max-w-[220px]">
              Laboratorio veterinario de Pets &amp; Pets.<br />Cali, Colombia.
            </p>
          </div>

          <div>
            <p className="font-mono text-[9px] tracking-[0.22em] uppercase opacity-65 mb-3">Sitio</p>
            <nav className="flex flex-col gap-2 font-sans text-xs leading-loose" aria-label="Sitio">
              {[
                ["/", "Inicio"],
                ["/servicios", "Servicios"],
                ["/veterinarios", "Veterinarios"],
                ["/nosotros", "Nosotros"],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="opacity-80 hover:opacity-100 transition-opacity">
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="font-mono text-[9px] tracking-[0.22em] uppercase opacity-65 mb-3">Servicios</p>
            <nav className="flex flex-col gap-2 font-sans text-xs leading-loose" aria-label="Servicios">
              {[
                ["/servicios#hematologia", "Hematología"],
                ["/servicios#bioquimica", "Bioquímica"],
                ["/servicios#citologia", "Citología"],
                ["/servicios#urinario", "Uroanálisis"],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="opacity-80 hover:opacity-100 transition-opacity">
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="font-mono text-[9px] tracking-[0.22em] uppercase opacity-65 mb-3">Contacto</p>
            <div className="flex flex-col gap-2 font-sans text-xs leading-loose opacity-80">
              <span>{SITE.address}</span>
              <a href={SITE.whatsapp} target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity">
                {SITE.phone}
              </a>
              <a href={SITE.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity">
                {SITE.instagram}
              </a>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-5">
          <span className="font-mono text-[9px] tracking-[0.22em] opacity-55">© 2026 PETS &amp; LAB</span>
          <div className="flex items-center gap-5">
            <span className="font-mono text-[9px] tracking-[0.22em] opacity-55">UNA MARCA DE LA FAMILIA PETS &amp; PETS</span>
            <Link href="/login" className="font-mono text-[8px] tracking-[0.18em] opacity-20 hover:opacity-50 transition-opacity">Staff</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
