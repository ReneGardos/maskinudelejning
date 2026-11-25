"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, CalendarDays, Check, CircleAlert, Truck, Warehouse } from "lucide-react"
import { addDays, bookingHref, daysBetween, formatShortDate, isFree, nextFreeStart, periodPresets } from "@/lib/availability-rules"
import { findDeliveryZone, formatKr, type Zone } from "@/lib/pricing"

export type QuickMachine = { slug: string; name: string; category: string; dailyPrice: number; deliveryAvailable: boolean; bookedRanges: Array<{ startDate: string; endDate: string }> }

export function QuickBooking({ machines, zones, today }: { machines: QuickMachine[]; zones: Zone[]; today: string }) {
  const [slug, setSlug] = useState("")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [delivery, setDelivery] = useState(false)
  const [postalCode, setPostalCode] = useState("")

  const categories = useMemo(() => Array.from(new Set(machines.map((item) => item.category))), [machines])
  const presets = useMemo(() => periodPresets(today), [today])
  const selected = machines.find((item) => item.slug === slug) ?? null
  const validPeriod = Boolean(start && end && end >= start && start >= today)
  const days = validPeriod ? daysBetween(start, end) : 0

  const postalReady = /^\d{4}$/.test(postalCode)
  const zone = delivery && postalReady ? findDeliveryZone(zones, postalCode) : null
  const deliveryFee = zone ? zone.deliveryFee + zone.collectionFee : 0
  const noZone = delivery && postalReady && zones.length > 0 && !zone

  const free = selected && validPeriod ? isFree(selected.bookedRanges, start, end) : null
  const nextStart = selected && validPeriod && free === false ? nextFreeStart(selected.bookedRanges, addDays(start, 1), days) : null
  const freeMachines = !selected && validPeriod ? machines.filter((item) => isFree(item.bookedRanges, start, end)) : []

  function choosePreset(preset: { start: string; end: string }) { setStart(preset.start); setEnd(preset.end) }
  function moveTo(newStart: string) { setStart(newStart); setEnd(addDays(newStart, days - 1)) }

  const catalogHref = validPeriod ? `/maskiner?start=${start}&end=${end}` : "/maskiner"
  const bookHref = bookingHref({ slug: selected?.slug, start: validPeriod ? start : undefined, end: validPeriod ? end : undefined, postalCode: delivery && postalReady ? postalCode : undefined })

  return (
    <div className="quick-booking">
      <div className="quick-fields">
        <label className="quick-field quick-machine">
          <span>Maskine</span>
          <select value={slug} onChange={(event) => setSlug(event.target.value)}>
            <option value="">Alle maskiner</option>
            {categories.map((category) => (
              <optgroup label={category} key={category}>
                {machines.filter((item) => item.category === category).map((item) => <option key={item.slug} value={item.slug}>{item.name} · {item.dailyPrice} kr./dag</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="quick-field">
          <span>Fra</span>
          <div className="input-like"><CalendarDays size={17} /><input type="date" min={today} value={start} onChange={(event) => { setStart(event.target.value); if (!end || event.target.value > end) setEnd(event.target.value) }} aria-label="Startdato" /></div>
        </label>
        <label className="quick-field">
          <span>Til</span>
          <div className="input-like"><CalendarDays size={17} /><input type="date" min={start || today} value={end} onChange={(event) => setEnd(event.target.value)} aria-label="Slutdato" /></div>
        </label>
        <div className="quick-field">
          <span>Levering</span>
          <div className="segmented" role="group" aria-label="Levering eller afhentning">
            <button type="button" className={!delivery ? "active" : ""} onClick={() => setDelivery(false)}><Warehouse size={15} /> Hent selv</button>
            <button type="button" className={delivery ? "active" : ""} onClick={() => setDelivery(true)}><Truck size={15} /> Levering</button>
          </div>
        </div>
        {delivery && (
          <label className="quick-field quick-postal">
            <span>Postnummer</span>
            <input inputMode="numeric" maxLength={4} placeholder="Fx 7400" value={postalCode} onChange={(event) => setPostalCode(event.target.value.replace(/\D/g, ""))} />
          </label>
        )}
      </div>

      <div className="quick-presets">
        {presets.map((preset) => <button type="button" key={preset.label} className={start === preset.start && end === preset.end ? "chip active" : "chip"} onClick={() => choosePreset(preset)}>{preset.label}</button>)}
        {validPeriod && <span className="muted">{days} {days === 1 ? "dag" : "dage"} · {formatShortDate(start)} – {formatShortDate(end)}</span>}
      </div>

      <div className="quick-result" aria-live="polite">
        {!validPeriod && (
          <div className="quick-message"><span>Vælg en periode for at se ledighed og pris med det samme.</span><Link href={selected ? `/maskiner/${selected.slug}` : "/maskiner"} className="button button-orange">{selected ? "Se maskinen" : "Se alle maskiner"} <ArrowRight size={17} /></Link></div>
        )}

        {validPeriod && selected && (
          <div className="quick-message">
            <div className="quick-status">
              {free
                ? <span className="availability ok"><Check size={16} /> {selected.name} er ledig</span>
                : <span className="availability busy"><CircleAlert size={16} /> Optaget i perioden{nextStart ? ` · ledig igen fra ${formatShortDate(nextStart)}` : ""}</span>}
              <span className="quick-price">
                <strong>{formatKr(days * selected.dailyPrice + deliveryFee)}</strong>
                <small>{days} × {formatKr(selected.dailyPrice)}{zone ? ` + levering ${formatKr(deliveryFee)}` : ""} · ekskl. moms</small>
              </span>
            </div>
            {delivery && !selected.deliveryAvailable && <span className="form-error">Denne maskine kan kun afhentes.</span>}
            {noZone && <span className="form-error">Vi leverer ikke til {postalCode}. Kontakt os, eller vælg afhentning.</span>}
            {delivery && postalReady && !zone && zones.length === 0 && <span className="muted">Leveringspris aftales ved bekræftelse.</span>}
            {free
              ? <Link href={bookHref} className="button button-orange">Book nu <ArrowRight size={17} /></Link>
              : nextStart && <button type="button" className="button button-orange" onClick={() => moveTo(nextStart)}>Vælg {formatShortDate(nextStart)} – {formatShortDate(addDays(nextStart, days - 1))}</button>}
          </div>
        )}

        {validPeriod && !selected && (
          <div className="quick-message">
            <div className="quick-status">
              <span className={freeMachines.length ? "availability ok" : "availability busy"}>{freeMachines.length ? <Check size={16} /> : <CircleAlert size={16} />} {freeMachines.length} af {machines.length} maskiner ledige</span>
              <div className="quick-free-list">
                {freeMachines.slice(0, 4).map((item) => <button type="button" key={item.slug} className="chip" onClick={() => setSlug(item.slug)}>{item.name} · {formatKr(days * item.dailyPrice)}</button>)}
                {freeMachines.length > 4 && <span className="muted">+{freeMachines.length - 4} flere</span>}
              </div>
            </div>
            <Link href={catalogHref} className="button button-orange">Se ledige maskiner <ArrowRight size={17} /></Link>
          </div>
        )}
      </div>
    </div>
  )
}
