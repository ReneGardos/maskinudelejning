import Link from "next/link"
import { ArrowRight, CalendarDays } from "lucide-react"
import { db } from "@/lib/db"
import { machine } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export default async function BookingPage() {
  const machines = await db.select({ slug: machine.slug, name: machine.name, category: machine.category, dailyPrice: machine.dailyPrice, image: machine.image }).from(machine).where(eq(machine.active, true))
  return <main className="site-shell"><header className="navbar"><div className="container nav-inner"><Link href="/" className="brand"><span className="brand-mark">M</span><span>maskin<span>udlejning</span><small>MASKINER TIL DINE PROJEKTER</small></span></Link><Link href="/maskiner" className="text-link">Tilbage til katalog</Link></div></header><section className="catalogue-hero"><div className="container"><p className="eyebrow orange">BOOKING</p><h1>Book en maskine</h1><p>Vælg maskinen først. På næste trin vælger du periode, levering, tilbehør og kundeoplysninger.</p></div></section><section className="section"><div className="container"><div className="booking-choice-grid">{machines.map((item) => <article className="booking-choice" key={item.slug}><img src={item.image} alt={item.name}/><div><span className="machine-type">{item.category}</span><h2>{item.name}</h2><p><CalendarDays size={15}/> Fra {item.dailyPrice} kr. pr. dag ekskl. moms</p><Link className="button button-dark" href={`/maskiner/${item.slug}`}>Vælg maskine <ArrowRight size={16}/></Link></div></article>)}</div></div></section></main>
}
