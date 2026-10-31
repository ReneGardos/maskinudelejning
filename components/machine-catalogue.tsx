"use client"

import Link from "next/link"
import { ArrowRight, Filter, SlidersHorizontal } from "lucide-react"
import { useMemo, useState } from "react"

type Machine = { id: string; slug: string; name: string; category: string; description: string; dailyPrice: number; image: string }

export function MachineCatalogue({ machines }: { machines: Machine[] }) {
  const [query, setQuery] = useState(""); const [category, setCategory] = useState("Alle kategorier")
  const categories = ["Alle kategorier", ...Array.from(new Set(machines.map((machine) => machine.category)))]
  const filtered = useMemo(() => machines.filter((machine) => machine.name.toLowerCase().includes(query.toLowerCase()) && (category === "Alle kategorier" || machine.category === category)), [machines, query, category])
  return <div className="catalogue-layout"><aside className="filters"><div className="filter-title"><strong>Filtrer maskiner</strong><SlidersHorizontal size={17}/></div><label>Søg efter maskine<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Fx minigraver" /></label><label>Kategori<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><div className="filter-box"><strong>Tilgængelighed</strong><label className="check"><input type="checkbox" defaultChecked /> Ledig i min periode</label><label className="check"><input type="checkbox" /> Kan leveres</label></div></aside><div className="catalogue-results"><div className="results-head"><span><strong>{filtered.length}</strong> maskiner fundet</span><button type="button"><Filter size={15}/> Sortér: Mest populære</button></div>{filtered.length ? <div className="machine-grid">{filtered.map((machine) => <article className="machine-card" key={machine.id}><div className="machine-image"><img src={machine.image} alt={machine.name} /><span className="machine-tag">Ledig</span></div><div className="machine-body"><span className="machine-type">{machine.category}</span><h3>{machine.name}</h3><p className="specs">{machine.description}</p><div className="machine-bottom"><div><strong>{machine.dailyPrice} kr.</strong><span>pr. dag ekskl. moms</span></div><Link href={`/maskiner/${machine.slug}`} className="round-arrow" aria-label={`Book ${machine.name}`}><ArrowRight size={17}/></Link></div></div></article>)}</div> : <div className="empty-state"><h2>Ingen maskiner fundet</h2><p className="muted">Prøv en anden søgning eller kategori.</p></div>}</div></div>
}
