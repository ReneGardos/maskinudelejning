import Link from "next/link"
import { notFound } from "next/navigation"
import { and, asc, eq, ne } from "drizzle-orm"
import { db } from "@/lib/db"
import { accessory, machine } from "@/lib/db/schema"
import { getBookedRanges } from "@/lib/availability"
import { isValidDateString, todayInDenmark } from "@/lib/booking-rules"
import { formatKr } from "@/lib/pricing"
import type { Metadata } from "next"
import { cache } from "react"
import { JsonLd } from "@/components/json-ld"
import { MachinePlanner } from "@/components/machine-planner"
import { SITE_AREA, SITE_NAME, absoluteUrl } from "@/lib/site"

// Samme opslag bruges af både metadata og siden; cache gør, at databasen kun spørges én gang.
const getMachine = cache(async (slug: string) => {
  const [row] = await db.select().from(machine).where(and(eq(machine.slug, slug), eq(machine.active, true))).limit(1)
  return row ?? null
})

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const item = await getMachine(slug)
  if (!item) return { title: "Maskinen findes ikke", robots: { index: false } }
  const lowerName = `${item.name.charAt(0).toLowerCase()}${item.name.slice(1)}`
  const title = `Lej ${lowerName} – ${item.dailyPrice} kr./dag`
  const description = `${item.description} Lej ${lowerName} fra ${formatKr(item.dailyPrice)} pr. dag ekskl. moms i ${SITE_AREA}. Se ledighed og book online${item.deliveryAvailable ? " med levering" : ""}.`.slice(0, 300)
  return {
    title,
    description,
    alternates: { canonical: `/maskiner/${item.slug}` },
    openGraph: { type: "website", title, description, url: `/maskiner/${item.slug}`, images: [{ url: absoluteUrl(item.image), alt: item.name }] },
    twitter: { card: "summary_large_image", title, description, images: [absoluteUrl(item.image)] },
  }
}

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ start?: string; end?: string }> }

export default async function MachineBookingPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { start, end } = await searchParams
  const item = await getMachine(slug)
  if (!item) notFound()
  const [bookedRanges, accessories, others] = await Promise.all([
    getBookedRanges(item.slug),
    db.select().from(accessory).where(and(eq(accessory.machineId, item.id), eq(accessory.active, true))).orderBy(asc(accessory.name)),
    db.select().from(machine).where(and(eq(machine.active, true), ne(machine.id, item.id))).orderBy(asc(machine.name)),
  ])
  // Samme kategori først, derefter resten.
  const related = [...others.filter((row) => row.category === item.category), ...others.filter((row) => row.category !== item.category)].slice(0, 3)
  const today = todayInDenmark()
  const validPeriod = start && end && isValidDateString(start) && isValidDateString(end) && end >= start && start >= today
  const specs = Object.entries(item.specifications ?? {})

  // Produktdata til Google: navn, billede og dagspris.
  const productData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: item.name,
    description: item.description,
    image: absoluteUrl(item.image),
    category: item.category,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/maskiner/${item.slug}`),
      priceCurrency: "DKK",
      price: item.dailyPrice,
      availability: "https://schema.org/InStock",
      businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
      priceSpecification: { "@type": "UnitPriceSpecification", price: item.dailyPrice, priceCurrency: "DKK", unitCode: "DAY", unitText: "dag", valueAddedTaxIncluded: false },
    },
  }
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Forside", item: absoluteUrl("/") },
      { "@type": "ListItem", position: 2, name: "Maskiner", item: absoluteUrl("/maskiner") },
      { "@type": "ListItem", position: 3, name: item.name, item: absoluteUrl(`/maskiner/${item.slug}`) },
    ],
  }

  return (
    <main className="machine-page">
      <JsonLd data={productData} />
      <JsonLd data={breadcrumbs} />
      <header className="navbar"><div className="container nav-inner"><Link href="/" className="brand"><span className="brand-mark">M</span><span>maskin<span>udlejning</span><small>MASKINER TIL DINE PROJEKTER</small></span></Link><nav className="nav-links"><Link href="/maskiner">Maskiner</Link><Link href="/min-konto">Min konto</Link></nav><Link href="/booking" className="button button-dark">Ny booking</Link></div></header>
      <div className="container machine-shell">
        <nav className="breadcrumbs" aria-label="Brødkrummer"><Link href="/">Forside</Link><span>/</span><Link href="/maskiner">Maskiner</Link><span>/</span><span aria-current="page">{item.name}</span></nav>
        <div className="machine-hero">
          <div className="machine-photo"><img src={item.image} alt={item.name} /></div>
          <div className="machine-info">
            <p className="eyebrow">{item.category}</p>
            <h1>{item.name}</h1>
            <p className="lead">{item.description}</p>
            <div className="machine-price"><strong>{formatKr(item.dailyPrice)}</strong><span>pr. dag ekskl. moms ({formatKr(Math.round(item.dailyPrice * 1.25))} inkl. moms)</span></div>
            <ul className="machine-facts">
              <li>{item.deliveryAvailable ? "Levering og afhentning mulig" : "Kun afhentning"}</li>
              <li>{item.deposit > 0 ? `Depositum ${formatKr(item.deposit)}, refunderes ved aflevering` : "Intet depositum"}</li>
              <li>Gennemgås og klargøres før hver udlejning</li>
              <li>Gratis afbestilling indtil dagen før start</li>
            </ul>
            {specs.length > 0 && (
              <dl className="spec-table">
                {specs.map(([key, value]) => <div key={key}><dt>{key.charAt(0).toUpperCase() + key.slice(1)}</dt><dd>{value}</dd></div>)}
              </dl>
            )}
          </div>
        </div>

        <section className="machine-section">
          <h2>Vælg periode</h2>
          <MachinePlanner
            slug={item.slug} name={item.name} dailyPrice={item.dailyPrice} deposit={item.deposit} deliveryAvailable={item.deliveryAvailable}
            bookedRanges={bookedRanges} today={today} initialStart={validPeriod ? start! : ""} initialEnd={validPeriod ? end! : ""}
            accessories={accessories.map((row) => ({ id: row.id, name: row.name, dailyPrice: row.dailyPrice, deposit: row.deposit }))}
          />
        </section>

        {accessories.length > 0 && (
          <section className="machine-section">
            <h2>Tilbehør</h2>
            <div className="accessory-grid">
              {accessories.map((row) => <div className="accessory-card" key={row.id}><strong>{row.name}</strong>{row.description && <p className="muted">{row.description}</p>}<span>{formatKr(row.dailyPrice)} pr. dag{row.deposit > 0 ? ` · depositum ${formatKr(row.deposit)}` : ""}</span></div>)}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="machine-section">
            <div className="section-head-row"><h2>Andre maskiner</h2><Link href="/maskiner" className="text-link">Se hele kataloget</Link></div>
            <div className="related-grid">
              {related.map((row) => (
                <Link href={`/maskiner/${row.slug}${validPeriod ? `?start=${start}&end=${end}` : ""}`} className="related-card" key={row.id}>
                  <img src={row.image} alt="" loading="lazy" />
                  <span className="machine-type">{row.category}</span>
                  <strong>{row.name}</strong>
                  <span>{formatKr(row.dailyPrice)} pr. dag</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  )
}
