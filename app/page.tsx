import { asc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { machine } from "@/lib/db/schema"
import HomePage, { type HomeMachine } from "@/components/home-page"
import { JsonLd } from "@/components/json-ld"
import { company } from "@/lib/company"
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site"

export const dynamic = "force-dynamic"

export default async function Page() {
  const rows = await db.select().from(machine).where(eq(machine.active, true)).orderBy(asc(machine.dailyPrice)).limit(3)
  const machines: HomeMachine[] = rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    type: row.category,
    price: row.dailyPrice,
    image: row.image,
    specs: Object.values((row.specifications ?? {}) as Record<string, string>).slice(0, 2).join(" · "),
  }))
  // Virksomhed og katalog til Google. Adresse og telefon tilføjes, når de rigtige firmaoplysninger er indsat i lib/company.ts.
  const business = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${SITE_URL}/#virksomhed`,
    name: SITE_NAME,
    url: SITE_URL,
    image: absoluteUrl("/maskiner-hero.png"),
    description: "Udlejning af pladevibrator, betonblander, brydehammer og flamingoskærer til private og erhverv.",
    areaServed: { "@type": "AdministrativeArea", name: "Midtjylland" },
    ...(company.cvr.startsWith("[") ? {} : { telephone: company.phone, email: company.email, address: { "@type": "PostalAddress", streetAddress: company.address.split(",")[0], addressCountry: "DK" } }),
    makesOffer: rows.map((row) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Product", name: row.name, url: absoluteUrl(`/maskiner/${row.slug}`) },
      priceSpecification: { "@type": "UnitPriceSpecification", price: row.dailyPrice, priceCurrency: "DKK", unitCode: "DAY" },
    })),
  }
  const website = { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: SITE_URL, inLanguage: "da-DK" }
  return <><JsonLd data={business} /><JsonLd data={website} /><HomePage machines={machines} /></>
}
