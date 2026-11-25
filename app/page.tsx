import { getCatalog } from "@/lib/catalog"
import HomePage, { type HomeMachine } from "@/components/home-page"
import { JsonLd } from "@/components/json-ld"
import { company } from "@/lib/company"
import { SITE_NAME, SITE_URL, absoluteUrl } from "@/lib/site"

export const dynamic = "force-dynamic"

export default async function Page() {
  const catalog = await getCatalog()
  // Fremhævede maskiner: de tre billigste. Hele kataloget bruges af hurtig-bookingen og til Google.
  const rows = [...catalog.machines].sort((a, b) => a.dailyPrice - b.dailyPrice).slice(0, 3)
  const machines: HomeMachine[] = rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    type: row.category,
    price: row.dailyPrice,
    image: row.image,
    specs: row.specs.slice(0, 2).map(([, value]) => value).join(" · "),
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
    makesOffer: catalog.machines.map((row) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Product", name: row.name, url: absoluteUrl(`/maskiner/${row.slug}`) },
      priceSpecification: { "@type": "UnitPriceSpecification", price: row.dailyPrice, priceCurrency: "DKK", unitCode: "DAY" },
    })),
  }
  const website = { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: SITE_URL, inLanguage: "da-DK" }
  return <><JsonLd data={business} /><JsonLd data={website} /><HomePage machines={machines} quickMachines={catalog.machines.map((row) => ({ slug: row.slug, name: row.name, category: row.category, image: row.image, dailyPrice: row.dailyPrice, deliveryAvailable: row.deliveryAvailable, bookedRanges: row.bookedRanges }))} zones={catalog.zones} today={catalog.today} /></>
}
