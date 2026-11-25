"use client"

import Link from "next/link"
import { ArrowRight, Check, CircleAlert, Search, Truck, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { addDays, bookingHref, daysBetween, formatShortDate, isFree, nextFreeStart, periodPresets } from "@/lib/availability-rules"
import { formatKr } from "@/lib/pricing"
import type { CatalogMachine } from "@/lib/catalog"

type Sort = "category" | "price-asc" | "price-desc"

export function MachineCatalogue({ machines, today, initialStart, initialEnd, initialQuery }: { machines: CatalogMachine[]; today: string; initialStart: string; initialEnd: string; initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState("")
  const [sort, setSort] = useState<Sort>("category")
  const [start, setStart] = useState(initialStart)
  const [end, setEnd] = useState(initialEnd)
  const [onlyFree, setOnlyFree] = useState(Boolean(initialStart))
  const [onlyDelivery, setOnlyDelivery] = useState(false)

  const presets = useMemo(() => periodPresets(today), [today])
  const validPeriod = Boolean(start && end && end >= start && start >= today)
  const days = validPeriod ? daysBetween(start, end) : 0

  // Periode og søgning gemmes i adressen, så et link til kataloget kan deles eller bogmærkes.
  useEffect(() => {
    const params = new URLSearchParams()
    if (query.trim()) params.set("q", query.trim())
    if (validPeriod) { params.set("start", start); params.set("end", end) }
    const next = params.toString() ? `/maskiner?${params}` : "/maskiner"
    if (`${window.location.pathname}${window.location.search}` !== next) window.history.replaceState(null, "", next)
  }, [query, start, end, validPeriod])

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of machines) counts.set(item.category, (counts.get(item.category) ?? 0) + 1)
    return Array.from(counts, ([name, count]) => ({ name, count }))
  }, [machines])

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const rows = machines
      .map((item) => {
        const free = validPeriod ? isFree(item.bookedRanges, start, end) : null
        return { item, free, nextStart: free === false ? nextFreeStart(item.bookedRanges, addDays(start, 1), days) : null }
      })
      .filter(({ item, free }) =>
        (!needle || `${item.name} ${item.category} ${item.description}`.toLowerCase().includes(needle)) &&
        (!category || item.category === category) &&
        (!onlyDelivery || item.deliveryAvailable) &&
        (!onlyFree || free !== false))
    if (sort === "price-asc") rows.sort((a, b) => a.item.dailyPrice - b.item.dailyPrice)
    if (sort === "price-desc") rows.sort((a, b) => b.item.dailyPrice - a.item.dailyPrice)
    return rows
  }, [machines, query, category, onlyDelivery, onlyFree, sort, validPeriod, start, end, days])

  const freeCount = validPeriod ? machines.filter((item) => isFree(item.bookedRanges, start, end)).length : machines.length

  function clearPeriod() { setStart(""); setEnd(""); setOnlyFree(false) }

  return (
    <div className="catalogue-v2">
      <div className="catalogue-toolbar">
        <label className="catalogue-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Søg fx pladevibrator, beton eller isolering" aria-label="Søg i maskiner" />{query && <button type="button" onClick={() => setQuery("")} aria-label="Ryd søgning"><X size={16} /></button>}</label>
        <div className="catalogue-period">
          <label>Fra<input type="date" min={today} value={start} onChange={(event) => { setStart(event.target.value); if (!end || event.target.value > end) setEnd(event.target.value); setOnlyFree(true) }} /></label>
          <label>Til<input type="date" min={start || today} value={end} onChange={(event) => { setEnd(event.target.value); setOnlyFree(true) }} /></label>
          <div className="chip-row">
            {presets.map((preset) => <button type="button" key={preset.label} className={start === preset.start && end === preset.end ? "chip active" : "chip"} onClick={() => { setStart(preset.start); setEnd(preset.end); setOnlyFree(true) }}>{preset.label}</button>)}
            {(start || end) && <button type="button" className="text-link" onClick={clearPeriod}>Ryd datoer</button>}
          </div>
        </div>
      </div>

      <div className="catalogue-filters">
        <div className="chip-row" role="group" aria-label="Kategori">
          <button type="button" className={!category ? "chip active" : "chip"} onClick={() => setCategory("")}>Alle <span className="chip-count">{machines.length}</span></button>
          {categories.map((item) => <button type="button" key={item.name} className={category === item.name ? "chip active" : "chip"} onClick={() => setCategory(item.name)}>{item.name} <span className="chip-count">{item.count}</span></button>)}
        </div>
        <div className="catalogue-options">
          {validPeriod && <label className="check"><input type="checkbox" checked={onlyFree} onChange={(event) => setOnlyFree(event.target.checked)} /> Kun ledige</label>}
          <label className="check"><input type="checkbox" checked={onlyDelivery} onChange={(event) => setOnlyDelivery(event.target.checked)} /> Kan leveres</label>
          <select value={sort} onChange={(event) => setSort(event.target.value as Sort)} aria-label="Sortering">
            <option value="category">Sortér: kategori</option>
            <option value="price-asc">Pris: lav til høj</option>
            <option value="price-desc">Pris: høj til lav</option>
          </select>
        </div>
      </div>

      <div className="results-head">
        <span><strong>{results.length}</strong> {results.length === 1 ? "maskine" : "maskiner"}{validPeriod ? ` · ${freeCount} ledige ${formatShortDate(start)} – ${formatShortDate(end)} (${days} ${days === 1 ? "dag" : "dage"})` : ""}</span>
      </div>

      {results.length ? (
        <div className="machine-grid">
          {results.map(({ item, free, nextStart }) => {
            const detailHref = validPeriod ? `/maskiner/${item.slug}?start=${start}&end=${end}` : `/maskiner/${item.slug}`
            return (
              <article className={`machine-card catalogue-card${free === false ? " is-busy" : ""}`} key={item.id}>
                <Link href={detailHref} className="machine-image">
                  <img src={item.image} alt={item.name} loading="lazy" />
                  {free === true && <span className="availability-badge ok"><Check size={14} /> Ledig</span>}
                  {free === false && <span className="availability-badge busy"><CircleAlert size={14} /> Optaget</span>}
                </Link>
                <div className="machine-body">
                  <span className="machine-type">{item.category}</span>
                  <h3><Link href={detailHref}>{item.name}</Link></h3>
                  <p className="specs">{item.description}</p>
                  {item.specs.length > 0 && <ul className="spec-chips">{item.specs.slice(0, 3).map(([key, value]) => <li key={key} title={key}>{value}</li>)}</ul>}
                  <div className="card-meta">
                    {item.deliveryAvailable && <span><Truck size={14} /> Kan leveres</span>}
                    {item.accessoryCount > 0 && <span>{item.accessoryCount} tilbehør</span>}
                    {item.deposit > 0 && <span>Depositum {formatKr(item.deposit)}</span>}
                  </div>
                  {free === false && <p className="busy-note">{nextStart ? <>Ledig igen fra <button type="button" className="text-link" onClick={() => { setStart(nextStart); setEnd(addDays(nextStart, days - 1)) }}>{formatShortDate(nextStart)}</button></> : "Ikke ledig inden for et år"}</p>}
                  <div className="machine-bottom">
                    <div>
                      <strong>{formatKr(item.dailyPrice)}</strong><span>pr. dag ekskl. moms</span>
                      {validPeriod && <small className="period-price">{days} {days === 1 ? "dag" : "dage"}: {formatKr(days * item.dailyPrice)}</small>}
                    </div>
                    {free === false
                      ? <Link href={detailHref} className="button button-light">Se ledighed</Link>
                      : <Link href={bookingHref({ slug: item.slug, start: validPeriod ? start : undefined, end: validPeriod ? end : undefined })} className="button button-dark">Book <ArrowRight size={16} /></Link>}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="empty-state">
          <h2>Ingen maskiner matcher</h2>
          <p className="muted">{validPeriod && onlyFree ? "Ingen ledige maskiner matcher i den periode. Prøv andre datoer, eller slå \"Kun ledige\" fra." : "Prøv en anden søgning eller kategori."}</p>
          <button type="button" className="button button-dark" onClick={() => { setQuery(""); setCategory(""); setOnlyDelivery(false); setOnlyFree(false) }}>Nulstil filtre</button>
        </div>
      )}
    </div>
  )
}
