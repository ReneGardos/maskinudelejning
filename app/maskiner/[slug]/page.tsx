import Link from "next/link"
import { notFound } from "next/navigation"
import { and, asc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { accessory, machine } from "@/lib/db/schema"
import { getBookedRanges } from "@/lib/availability"
import { isValidDateString, todayInDenmark } from "@/lib/booking-rules"
import { formatKr } from "@/lib/pricing"

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ start?: string; end?: string }> }

export default async function MachineBookingPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { start, end } = await searchParams
  const [item] = await db.select().from(machine).where(and(eq(machine.slug, slug), eq(machine.active, true))).limit(1)
  if (!item) notFound()
  const [bookedRanges, accessories] = await Promise.all([
    getBookedRanges(item.slug),
    db.select().from(accessory).where(and(eq(accessory.machineId, item.id), eq(accessory.active, true))).orderBy(asc(accessory.name)),
  ])
  const today = todayInDenmark()
  const validPeriod = start && end && isValidDateString(start) && isValidDateString(end) && end >= start && start >= today
  const specs = Object.entries(item.specifications ?? {})
  const formatDate = (value: string) => value.split("-").reverse().join(".")

  return (
    <main className="booking-page">
      <Link href="/maskiner" className="back-link">← Tilbage til maskiner</Link>
      <div className="booking-layout">
        <section className="booking-intro">
          <p className="eyebrow">{item.category}</p>
          <h1>{item.name}</h1>
          <p className="lead">{item.description}</p>
          <div className="machine-specs">
            <span><strong>{formatKr(item.dailyPrice)}</strong> pr. dag ekskl. moms</span>
            {item.deposit > 0 && <span>Depositum: <strong>{formatKr(item.deposit)}</strong> (refunderes)</span>}
          </div>
          {specs.length > 0 && (
            <dl className="spec-list">
              {specs.map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}
            </dl>
          )}
          <img src={item.image} alt={item.name} />
        </section>
        <section className="booking-card">
          <p className="eyebrow">Booking</p>
          <h2>Book maskinen</h2>
          <p className="muted">Vælg periode, tilbehør og levering. Du kan tilføje flere maskiner i samme booking og ser den samlede pris, før du sender.</p>
          {accessories.length > 0 && (
            <div className="machine-accessories"><span className="order-sub">Tilbehør til denne maskine</span>
              <ul>{accessories.map((row) => <li key={row.id}><strong>{row.name}</strong> · {formatKr(row.dailyPrice)} pr. dag{row.deposit > 0 ? ` · depositum ${formatKr(row.deposit)}` : ""}</li>)}</ul>
            </div>
          )}
          {bookedRanges.length > 0 && <p className="muted"><strong>Allerede optaget:</strong> {bookedRanges.map((range) => range.startDate === range.endDate ? formatDate(range.startDate) : `${formatDate(range.startDate)} – ${formatDate(range.endDate)}`).join(" · ")}</p>}
          <Link href={`/booking?${new URLSearchParams({ maskine: item.slug, ...(validPeriod ? { start: start!, end: end! } : {}) }).toString()}`} className="button button-dark order-submit">Book denne maskine</Link>
          <p className="muted small-print">{item.deliveryAvailable ? "Kan afhentes eller leveres." : "Kan kun afhentes."}</p>
        </section>
      </div>
    </main>
  )
}
