"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Check, ChevronLeft, ChevronRight, CircleAlert } from "lucide-react"
import { addDays, bookingHref, daysBetween, formatShortDate, isBookedDay, isFree, nextFreeStart, periodPresets, type Range } from "@/lib/availability-rules"
import { formatKr } from "@/lib/pricing"

const WEEKDAYS = ["Ma", "Ti", "On", "To", "Fr", "Lø", "Sø"]
const MONTHS = ["januar", "februar", "marts", "april", "maj", "juni", "juli", "august", "september", "oktober", "november", "december"]

/** Dage i en måned, med tomme felter før den 1., så ugen starter mandag. */
function monthGrid(year: number, month: number) {
  const first = new Date(Date.UTC(year, month, 1))
  const offset = (first.getUTCDay() + 6) % 7
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const cells: Array<string | null> = Array(offset).fill(null)
  for (let day = 1; day <= count; day++) cells.push(new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10))
  return cells
}

type Props = {
  slug: string; name: string; dailyPrice: number; deposit: number; deliveryAvailable: boolean
  bookedRanges: Range[]; today: string; initialStart: string; initialEnd: string
  accessories: Array<{ id: string; name: string; dailyPrice: number; deposit: number }>
}

export function MachinePlanner({ slug, name, dailyPrice, deposit, deliveryAvailable, bookedRanges, today, initialStart, initialEnd, accessories }: Props) {
  const [start, setStart] = useState(initialStart)
  const [end, setEnd] = useState(initialEnd)
  const [monthOffset, setMonthOffset] = useState(0)
  const presets = useMemo(() => periodPresets(today), [today])

  const validPeriod = Boolean(start && end && end >= start && start >= today)
  const days = validPeriod ? daysBetween(start, end) : 0
  const free = validPeriod ? isFree(bookedRanges, start, end) : null
  const nextStart = free === false ? nextFreeStart(bookedRanges, addDays(start, 1), days) : null

  const [year, month] = today.split("-").map(Number)
  const months = [0, 1].map((step) => {
    const date = new Date(Date.UTC(year, month - 1 + monthOffset + step, 1))
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() }
  })

  // Klik på en dag: første klik vælger start, andet klik vælger slut (eller ny start, hvis dagen ligger før).
  function pickDay(day: string) {
    if (!start || (start && end && start !== end) || day < start) { setStart(day); setEnd(day); return }
    setEnd(day)
  }

  return (
    <div className="planner">
      <div className="planner-calendar" aria-label="Ledighedskalender">
        <div className="calendar-nav">
          <button type="button" onClick={() => setMonthOffset((value) => Math.max(0, value - 1))} disabled={monthOffset === 0} aria-label="Forrige måned"><ChevronLeft size={18} /></button>
          <span>Ledighed</span>
          <button type="button" onClick={() => setMonthOffset((value) => Math.min(10, value + 1))} aria-label="Næste måned"><ChevronRight size={18} /></button>
        </div>
        <div className="calendar-months">
          {months.map(({ year: y, month: m }) => (
            <div className="calendar-month" key={`${y}-${m}`}>
              <strong>{MONTHS[m]} {y}</strong>
              <div className="calendar-grid">
                {WEEKDAYS.map((day) => <span className="calendar-weekday" key={day}>{day}</span>)}
                {monthGrid(y, m).map((day, index) => {
                  if (!day) return <span key={`empty-${index}`} />
                  const past = day < today
                  const booked = isBookedDay(bookedRanges, day)
                  const selected = validPeriod && day >= start && day <= end
                  const className = ["calendar-day", past && "past", booked && "booked", selected && "selected", day === today && "today"].filter(Boolean).join(" ")
                  return <button type="button" key={day} className={className} disabled={past || booked} onClick={() => pickDay(day)} aria-label={`${Number(day.slice(8))}. ${MONTHS[m]}${booked ? ", optaget" : ""}`} aria-pressed={selected}>{Number(day.slice(8))}</button>
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="calendar-legend"><span><i className="legend-free" /> Ledig</span><span><i className="legend-booked" /> Optaget</span><span><i className="legend-selected" /> Din periode</span></div>
      </div>

      <div className="planner-summary">
        <div className="form-row">
          <label>Fra<input type="date" min={today} value={start} onChange={(event) => { setStart(event.target.value); if (!end || event.target.value > end) setEnd(event.target.value) }} /></label>
          <label>Til<input type="date" min={start || today} value={end} onChange={(event) => setEnd(event.target.value)} /></label>
        </div>
        <div className="chip-row">{presets.map((preset) => <button type="button" key={preset.label} className={start === preset.start && end === preset.end ? "chip active" : "chip"} onClick={() => { setStart(preset.start); setEnd(preset.end) }}>{preset.label}</button>)}</div>

        {!validPeriod && <p className="muted">Vælg datoer i kalenderen eller ovenfor for at se pris og ledighed.</p>}
        {validPeriod && (
          <>
            {free
              ? <p className="availability ok"><Check size={16} /> Ledig {formatShortDate(start)} – {formatShortDate(end)}</p>
              : <p className="availability busy"><CircleAlert size={16} /> Optaget i perioden{nextStart && <> · <button type="button" className="text-link" onClick={() => { setStart(nextStart); setEnd(addDays(nextStart, days - 1)) }}>vælg {formatShortDate(nextStart)} – {formatShortDate(addDays(nextStart, days - 1))}</button></>}</p>}
            <div className="summary-row"><span>{days} {days === 1 ? "dag" : "dage"} × {formatKr(dailyPrice)}</span><strong>{formatKr(days * dailyPrice)}</strong></div>
            {deposit > 0 && <div className="summary-row summary-deposit"><span>Depositum (refunderes)</span><span>{formatKr(deposit)}</span></div>}
          </>
        )}
        {accessories.length > 0 && <p className="muted small-print">Tilbehør ({accessories.map((item) => `${item.name} ${formatKr(item.dailyPrice)}/dag`).join(", ")}) vælges på bookingsiden.</p>}
        <Link href={bookingHref({ slug, start: validPeriod && free ? start : undefined, end: validPeriod && free ? end : undefined })} className={`button button-dark order-submit${validPeriod && !free ? " disabled" : ""}`} aria-disabled={validPeriod && !free}>Book {name.charAt(0).toLowerCase() + name.slice(1)} <ArrowRight size={17} /></Link>
        <p className="muted small-print">{deliveryAvailable ? "Kan afhentes eller leveres." : "Kan kun afhentes."} Du kan tilføje flere maskiner i samme booking.</p>
      </div>
    </div>
  )
}
