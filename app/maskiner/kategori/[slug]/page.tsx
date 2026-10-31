import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { machine } from "@/lib/db/schema"
import { MachineCatalogue } from "@/components/machine-catalogue"

const categories: Record<string, string> = { komprimering: "Komprimering", jordarbejde: "Jordarbejde", transport: "Transport", nedbrydning: "Nedbrydning" }

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const category = categories[slug]; if (!category) return <main className="site-shell"><div className="container section"><h1>Kategorien blev ikke fundet</h1><Link href="/maskiner" className="button button-dark">Se alle maskiner</Link></div></main>; const machines = await db.select({ id: machine.id, slug: machine.slug, name: machine.name, category: machine.category, manufacturer: machine.manufacturer, description: machine.description, dailyPrice: machine.dailyPrice, image: machine.image, deliveryAvailable: machine.deliveryAvailable, specifications: machine.specifications }).from(machine).where(and(eq(machine.active, true), eq(machine.category, category))); return <main className="site-shell"><header className="navbar"><div className="container nav-inner"><Link href="/" className="brand"><span className="brand-mark">M</span><span>maskin<span>udlejning</span><small>MASKINER TIL DINE PROJEKTER</small></span></Link><Link href="/maskiner" className="text-link">Alle maskiner</Link></div></header><section className="catalogue-hero"><div className="container"><Link href="/maskiner" className="back-link"><ArrowLeft size={15}/> Alle maskiner</Link><p className="eyebrow orange">KATEGORI</p><h1>{category}</h1><p>Se maskiner i kategorien og vælg den rigtige til dit projekt.</p></div></section><section className="section catalogue-page"><div className="container"><MachineCatalogue machines={machines}/></div></section></main> }
