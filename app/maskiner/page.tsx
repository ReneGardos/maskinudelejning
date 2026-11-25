import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { MachineCatalogue } from "@/components/machine-catalogue"
import { getCatalog } from "@/lib/catalog"
import { isValidDateString } from "@/lib/booking-rules"

import type { Metadata } from "next"
import { SITE_AREA } from "@/lib/site"

export const metadata: Metadata = {
  title: `Maskiner til leje i ${SITE_AREA}`,
  description: `Se alle maskiner til leje: pladevibrator, betonblander, brydehammer og flamingoskærer. Tjek ledighed for din periode og book online i ${SITE_AREA}.`,
  alternates: { canonical: "/maskiner" },
}

export const dynamic = "force-dynamic"

type SearchParams = Promise<{ start?: string; end?: string; q?: string }>

export default async function MachinesPage({ searchParams }: { searchParams: SearchParams }) {
  const { start, end, q } = await searchParams
  const { machines, today } = await getCatalog()
  // Ugyldige datoer ignoreres, så kataloget altid kan vises. Ledighed beregnes i browseren ud fra de optagede perioder.
  const valid = start && end && isValidDateString(start) && isValidDateString(end) && end >= start && start >= today

  return <main className="site-shell"><header className="navbar"><div className="container nav-inner"><Link href="/" className="brand"><span className="brand-mark">M</span><span>maskin<span>udlejning</span><small>MASKINER TIL DINE PROJEKTER</small></span></Link><nav className="nav-links"><Link href="/maskiner">Maskiner</Link><Link href="/#projekter">Find din maskine</Link><Link href="/#saadan">Sådan fungerer det</Link></nav><Link href="/booking" className="button button-dark">Book en maskine <ArrowRight size={16} /></Link></div></header><section className="catalogue-hero"><div className="container"><Link href="/" className="back-link"><ArrowLeft size={15}/> Forside</Link><p className="eyebrow orange">VORES KATALOG</p><h1>Maskiner til dit projekt</h1><p>Vælg din periode og se med det samme, hvad der er ledigt, og hvad det koster. Book flere maskiner i én samlet booking.</p></div></section><section className="section catalogue-page"><div className="container"><MachineCatalogue machines={machines} today={today} initialStart={valid ? start : ""} initialEnd={valid ? end : ""} initialQuery={(q ?? "").slice(0, 100)} /></div></section></main>
}
