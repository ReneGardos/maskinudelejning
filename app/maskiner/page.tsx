import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { db } from "@/lib/db"
import { machine } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { MachineCatalogue } from "@/components/machine-catalogue"

export default async function MachinesPage({ searchParams }: { searchParams: Promise<{ query?: string }> }) {
  const { query = "" } = await searchParams
  const machines = await db.select({ id: machine.id, slug: machine.slug, name: machine.name, category: machine.category, manufacturer: machine.manufacturer, description: machine.description, dailyPrice: machine.dailyPrice, image: machine.image, deliveryAvailable: machine.deliveryAvailable, specifications: machine.specifications }).from(machine).where(eq(machine.active, true))
  return <main className="site-shell"><header className="navbar"><div className="container nav-inner"><Link href="/" className="brand"><span className="brand-mark">M</span><span>maskin<span>udlejning</span><small>MASKINER TIL DINE PROJEKTER</small></span></Link><nav className="nav-links"><Link href="/maskiner">Maskiner</Link><Link href="/#projekter">Find din maskine</Link><Link href="/#saadan">Sådan fungerer det</Link></nav><Link href="/#booking" className="button button-dark">Book en maskine <ArrowRight size={16} /></Link></div></header><section className="catalogue-hero"><div className="container"><Link href="/" className="back-link"><ArrowLeft size={15}/> Forside</Link><p className="eyebrow orange">VORES KATALOG</p><h1>Maskiner til dit projekt</h1><p>Find det rigtige materiel, se ledighed og book online.</p></div></section><section className="section catalogue-page"><div className="container"><MachineCatalogue machines={machines} initialQuery={query} /></div></section></main>
}
