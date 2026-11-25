"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, CalendarDays, Check, CircleAlert, Hammer, Layers, Package, Truck, Warehouse, Wrench } from "lucide-react"
import { addDays, daysBetween, formatShortDate, isFree, nextFreeStart, periodPresets } from "@/lib/availability-rules"
import { findDeliveryZone, formatKr, type Zone } from "@/lib/pricing"

export type QuickMachine = { slug: string; name: string; category: string; image: string; dailyPrice: number; deliveryAvailable: boolean; bookedRanges: Array<{ startDate: string; endDate: string }> }

// Opgaver, kunden kan vælge i stedet for maskinnavne. Maskiner matches på navn og kategori.
const TASKS = [
  { id: "komprimering", label: "Komprimere jord og grus", hint: "Terrasse, indkørsel, fliser", icon: Layers, match: /plade|komprim|vibrator/i },
  { id: "beton", label: "Blande beton og mørtel", hint: "Fundament, støbning, puds", icon: Package, match: /beton|bland|mørtel/i },
  { id: "nedbrydning", label: "Bryde beton og fliser", hint: "Gulve, fundamenter, asfalt", icon: Hammer, match: /bryde|hammer|nedbryd/i },
  { id: "isolering", label: "Skære isolering", hint: "Flamingo til sokkel og terrændæk", icon: Wrench, match: /flamingo|isoler|eps/i },
] as const

export function QuickBooking({ machines, zones, today }: { machines: QuickMachine[]; zones: Zone[]; today: string }) {
  const [mode, setMode] = useState<"machine" | "task">("machine")
  const [task, setTask] = useState<string>("")
  const [selected, setSelected] = useState<string[]>([])
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [delivery, setDelivery] = useState(false)
  const [postalCode, setPostalCode] = useState("")

  const presets = useMemo(() => periodPresets(today), [today])
  const validPeriod = Boolean(start && end && end >= start && start >= today)
  const days = validPeriod ? daysBetween(start, end) : 0

  const activeTask = TASKS.find((item) => item.id === task)
  const shown = mode === "task" && activeTask ? machines.filter((item) => activeTask.match.test(`${item.name} ${item.category}`)) : machines

  const postalReady = /^\d{4}$/.test(postalCode)
  const zone = delivery && postalReady ? findDeliveryZone(zones, postalCode) : null
  const deliveryFee = zone ? zone.deliveryFee + zone.collectionFee : 0
  const noZone = delivery && postalReady && zones.length > 0 && !zone

  const status = (item: QuickMachine) => {
    if (!validPeriod) return { free: null as boolean | null, next: null as string | null }
    const free = isFree(item.bookedRanges, start, end)
    return { free, next: free ? null : nextFreeStart(item.bookedRanges, addDays(start, 1), days) }
  }
  const chosen = machines.filter((item) => selected.includes(item.slug))
  const chosenBusy = chosen.filter((item) => status(item).free === false)
  const notDeliverable = delivery ? chosen.filter((item) => !item.deliveryAvailable) : []
  const rental = chosen.reduce((sum, item) => sum + days * item.dailyPrice, 0)
  const freeCount = validPeriod ? machines.filter((item) => isFree(item.bookedRanges, start, end)).length : machines.length

  function toggle(slug: string) { setSelected((current) => current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]) }
  function chooseTask(id: string) {
    setTask(id)
    const match = TASKS.find((item) => item.id === id)
    const first = match ? machines.find((item) => match.match.test(`${item.name} ${item.category}`)) : undefined
    if (first && !selected.includes(first.slug)) setSelected((current) => [...current, first.slug])
  }

  const params = new URLSearchParams()
  if (chosen.length) params.set("maskine", chosen.map((item) => item.slug).join(","))
  if (validPeriod) { params.set("start", start); params.set("end", end) }
  if (delivery && postalReady) { params.set("levering", "1"); params.set("postnr", postalCode) }
  const bookHref = `/booking${params.toString() ? `?${params}` : ""}`
  const canBook = chosen.length > 0 && validPeriod && chosenBusy.length === 0 && notDeliverable.length === 0 && !noZone

  return (
    <div className="qb">
      <ul className="qb-tabs" role="tablist">
        <li><button type="button" role="tab" aria-selected={mode === "machine"} className={mode === "machine" ? "active" : ""} onClick={() => setMode("machine")}>Vælg maskine</button></li>
        <li><button type="button" role="tab" aria-selected={mode === "task"} className={mode === "task" ? "active" : ""} onClick={() => setMode("task")}>Vælg opgave</button></li>
      </ul>

      <div className="qb-body">
        <div className="qb-step">
          <span className="qb-step-label"><span className="qb-num">1</span>{mode === "task" ? "Hvad skal du lave?" : "Hvilke maskiner skal du bruge?"} <small>Vælg gerne flere</small></span>
          {mode === "task" && (
            <div className="qb-tasks">
              {TASKS.map((item) => {
                const Icon = item.icon
                return (
                  <button type="button" key={item.id} className={task === item.id ? "qb-task active" : "qb-task"} onClick={() => chooseTask(item.id)}>
                    <Icon size={20} /><span><strong>{item.label}</strong><small>{item.hint}</small></span>
                  </button>
                )
              })}
            </div>
          )}
          {(mode === "machine" || activeTask) && (
            <div className="qb-machines">
              {shown.length === 0 && <p className="muted">Vi har ingen maskiner til den opgave endnu. Ring til os, så finder vi en løsning.</p>}
              {shown.map((item) => {
                const { free } = status(item)
                const isOn = selected.includes(item.slug)
                return (
                  <label key={item.slug} className={`qb-machine${isOn ? " active" : ""}${free === false ? " busy" : ""}`}>
                    <input type="checkbox" checked={isOn} onChange={() => toggle(item.slug)} />
                    <img src={item.image} alt="" />
                    <span className="qb-machine-text">
                      <strong>{item.name}</strong>
                      <small>{formatKr(item.dailyPrice)}/dag{free === true && <span className="qb-badge ok">Ledig</span>}{free === false && <span className="qb-badge busy">Optaget</span>}</small>
                    </span>
                    <span className="qb-check" aria-hidden><Check size={14} /></span>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        <div className="qb-step">
          <span className="qb-step-label"><span className="qb-num">2</span>Hvornår og hvordan?</span>
          <div className="qb-row">
            <div className="qb-float">
              <input id="qb-start" type="date" min={today} value={start} placeholder=" " onChange={(event) => { setStart(event.target.value); if (!end || event.target.value > end) setEnd(event.target.value) }} />
              <label htmlFor="qb-start"><CalendarDays size={14} /> Fra</label>
            </div>
            <div className="qb-float">
              <input id="qb-end" type="date" min={start || today} value={end} placeholder=" " onChange={(event) => setEnd(event.target.value)} />
              <label htmlFor="qb-end"><CalendarDays size={14} /> Til</label>
            </div>
            <div className="qb-toggle" role="group" aria-label="Levering eller afhentning">
              <button type="button" className={!delivery ? "active" : ""} onClick={() => setDelivery(false)}><Warehouse size={16} /> Hent selv</button>
              <button type="button" className={delivery ? "active" : ""} onClick={() => setDelivery(true)}><Truck size={16} /> Levering</button>
            </div>
            {delivery && (
              <div className="qb-float qb-postal">
                <input id="qb-postal" inputMode="numeric" maxLength={4} placeholder=" " value={postalCode} onChange={(event) => setPostalCode(event.target.value.replace(/\D/g, ""))} />
                <label htmlFor="qb-postal">Postnummer</label>
              </div>
            )}
          </div>
          <div className="qb-presets">
            {presets.map((preset) => <button type="button" key={preset.label} className={start === preset.start && end === preset.end ? "qb-pill active" : "qb-pill"} onClick={() => { setStart(preset.start); setEnd(preset.end) }}>{preset.label}</button>)}
            {validPeriod && <span className="muted">{days} {days === 1 ? "dag" : "dage"} · {formatShortDate(start)}–{formatShortDate(end)} · {freeCount} af {machines.length} maskiner ledige</span>}
          </div>
        </div>
      </div>

      <div className="qb-footer" aria-live="polite">
        <div className="qb-summary">
          {chosen.length === 0 && <span className="muted">{validPeriod ? "Vælg en eller flere maskiner for at se den samlede pris." : "Vælg maskiner og periode, så ser du ledighed og pris med det samme."}</span>}
          {chosen.length > 0 && !validPeriod && <span><strong>{chosen.length} {chosen.length === 1 ? "maskine" : "maskiner"} valgt</strong> · vælg periode for at se pris og ledighed</span>}
          {chosen.length > 0 && validPeriod && (
            <>
              <span className="qb-total"><small>{chosen.length} {chosen.length === 1 ? "maskine" : "maskiner"} · {days} {days === 1 ? "dag" : "dage"}{zone ? ` · levering ${formatKr(deliveryFee)}` : ""}</small><strong>{formatKr(rental + deliveryFee)}</strong><small>ekskl. moms</small></span>
              {chosenBusy.map((item) => {
                const next = status(item).next
                return <span key={item.slug} className="qb-alert"><CircleAlert size={15} /> {item.name} er optaget{next ? <> · <button type="button" className="text-link" onClick={() => { setStart(next); setEnd(addDays(next, days - 1)) }}>flyt til {formatShortDate(next)}–{formatShortDate(addDays(next, days - 1))}</button></> : ""}</span>
              })}
              {notDeliverable.map((item) => <span key={item.slug} className="qb-alert"><CircleAlert size={15} /> {item.name} kan kun afhentes</span>)}
              {noZone && <span className="qb-alert"><CircleAlert size={15} /> Vi leverer ikke til {postalCode}</span>}
              {delivery && postalReady && !zone && zones.length === 0 && <span className="muted">Leveringspris aftales</span>}
            </>
          )}
        </div>
        <div className="qb-actions">
          <Link href={validPeriod ? `/maskiner?start=${start}&end=${end}` : "/maskiner"} className="button button-light">Se katalog</Link>
          {canBook
            ? <Link href={bookHref} className="button button-orange">Book {chosen.length > 1 ? `${chosen.length} maskiner` : "nu"} <ArrowRight size={17} /></Link>
            : <span className="button button-orange is-disabled" aria-disabled="true">Book nu <ArrowRight size={17} /></span>}
        </div>
      </div>
    </div>
  )
}
