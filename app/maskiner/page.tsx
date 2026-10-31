'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, CalendarDays, Filter, Search, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'

const items = [
  ['90 kg pladevibrator','Komprimering','395','90 kg · Benzin','Mest lejet'],
  ['30 kg betonhammer','Nedbrydning','295','30 kg · 230 V','Klar til afhentning'],
  ['Fritstående betonblander','Beton & blanding','325','140 L · 230 V','Populær'],
  ['Minigraver 1,8 ton','Gravning','895','1.800 kg · Diesel','Demo inventory'],
  ['Minilæsser 1,2 ton','Jord & anlæg','1.095','1.200 kg · Diesel','Demo inventory'],
  ['Motorbør 500 kg','Transport','595','500 kg · Benzin','Demo inventory'],
]

export default function MachinesPage() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Alle kategorier')
  const filtered = items.filter((item) => item[0].toLowerCase().includes(query.toLowerCase()) && (category === 'Alle kategorier' || item[1] === category))
  return <main className="site-shell"><header className="navbar"><div className="container nav-inner"><Link href="/" className="brand"><span className="brand-mark">M</span><span>maskin<span>udlejning</span><small>MASKINER TIL DINE PROJEKTER</small></span></Link><nav className="nav-links"><Link href="/maskiner">Maskiner</Link><Link href="/#projekter">Find din maskine</Link><Link href="/#saadan">Sådan fungerer det</Link></nav><Link href="/#booking" className="button button-dark">Book en maskine <ArrowRight size={16} /></Link></div></header><section className="catalogue-hero"><div className="container"><Link href="/" className="back-link"><ArrowLeft size={15}/> Forside</Link><p className="eyebrow orange">VORES KATALOG</p><h1>Maskiner til dit projekt</h1><p>Find det rigtige materiel, se ledighed og book online.</p></div></section><section className="section catalogue-page"><div className="container catalogue-layout"><aside className="filters"><div className="filter-title"><strong>Filtrer maskiner</strong><SlidersHorizontal size={17}/></div><label>Søg efter maskine<input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Fx minigraver" /></label><label>Kategori<select value={category} onChange={(e)=>setCategory(e.target.value)}><option>Alle kategorier</option><option>Komprimering</option><option>Nedbrydning</option><option>Beton & blanding</option><option>Gravning</option><option>Jord & anlæg</option><option>Transport</option></select></label><div className="filter-box"><strong>Tilgængelighed</strong><label className="check"><input type="checkbox" defaultChecked /> Ledig i min periode</label><label className="check"><input type="checkbox" /> Kan leveres</label></div></aside><div className="catalogue-results"><div className="results-head"><span><strong>{filtered.length}</strong> maskiner fundet</span><button><Filter size={15}/> Sortér: Mest populære</button></div><div className="machine-grid">{filtered.map((machine) => <article className="machine-card" key={machine[0]}><div className="machine-image"><img src="/maskiner-hero.png" alt={machine[0]} /><span className="machine-tag">{machine[4]}</span></div><div className="machine-body"><p className="machine-type">{machine[1]}</p><h3>{machine[0]}</h3><p className="specs">{machine[3]}</p><div className="machine-bottom"><div><strong>{machine[2]} kr.</strong><span>/ dag ekskl. moms</span></div><Link href="#booking" className="round-arrow" aria-label={`Book ${machine[0]}`}><ArrowRight size={18}/></Link></div></div></article>)}</div></div></div></section></main>
}
