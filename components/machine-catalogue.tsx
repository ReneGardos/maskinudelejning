"use client"

import Link from "next/link"
import { ArrowRight, SlidersHorizontal } from "lucide-react"
import { useMemo, useState } from "react"

type Machine = { id: string; slug: string; name: string; category: string; description: string; dailyPrice: number; image: string }
type Period = { start: string; end: string } | null

function formatDate(value: string) {
  const [y, m, d] = value.split("-")
  return `${d}.${m}.${y}`
}

export function MachineCatalogue({ machines, period, today, initialQuery }: { machines: Machine[]; period: Period; today: string; initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery); const [category, setCategory] = useState("Alle kategorier")
  const categories = ["Alle kategorier", ...Array.from(new Set(machines.map((machine) => machine.category)))]
  const filtered = useMemo(() => machines.filter((machine) => machine.name.toLowerCase().includes(query.toLowerCase()) && (category === "Alle kategorier" || machine.category === category)), [machines, query, category])
  // Med en valgt periode sendes datoerne videre til maskinsiden, så de er udfyldt dér.
  const machineHref = (slug: string) => period ? `/maskiner/${slug}?start=${period.start}&end=${period.end}` : `/maskiner/${slug}`
  return (
    <div className="catalogue-layout">
      <aside className="filters">
        <div className="filter-title"><strong>Filtrer maskiner</strong><SlidersHorizontal size={17}/></div>
        <label>Søg efter maskine<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Fx minigraver" /></label>
        <label>Kategori<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <form className="filter-box" method="get" action="/maskiner" key={`${period?.start}-${period?.end}`}>
          <strong>Ledig i periode</strong>
          <label>Fra<input type="date" name="start" min={today} defaultValue={period?.start ?? ""} required /></label>
          <label>Til<input type="date" name="end" min={today} defaultValue={period?.end ?? ""} required /></label>
          <button type="submit" className="button button-dark">Vis ledige maskiner</button>
          {period && <Link href="/maskiner" className="text-link">Ryd datoer</Link>}
        </form>
      </aside>
      <div className="catalogue-results">
        <div className="results-head"><span><strong>{filtered.length}</strong> {period ? `maskiner ledige ${formatDate(period.start)} – ${formatDate(period.end)}` : "maskiner fundet"}</span></div>
        {filtered.length ? (
          <div className="machine-grid">{filtered.map((machine) => (
            <article className="machine-card" key={machine.id}>
              <div className="machine-image"><img src={machine.image} alt={machine.name} />{period && <span className="machine-tag">Ledig i perioden</span>}</div>
              <div className="machine-body">
                <span className="machine-type">{machine.category}</span><h3>{machine.name}</h3><p className="specs">{machine.description}</p>
                <div className="machine-bottom"><div><strong>{machine.dailyPrice} kr.</strong><span>pr. dag ekskl. moms</span></div><Link href={machineHref(machine.slug)} className="round-arrow" aria-label={`Book ${machine.name}`}><ArrowRight size={17}/></Link></div>
              </div>
            </article>
          ))}</div>
        ) : (
          <div className="empty-state"><h2>Ingen maskiner fundet</h2><p className="muted">{period ? "Ingen maskiner matcher i den periode. Prøv andre datoer eller en anden søgning." : "Prøv en anden søgning eller kategori."}</p></div>
        )}
      </div>
    </div>
  )
}
