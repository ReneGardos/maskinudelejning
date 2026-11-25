import Link from "next/link"
import { notFound } from "next/navigation"
import { and, asc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { accessory, deliveryZone, machine } from "@/lib/db/schema"
import { getSessionUser } from "@/lib/session"
import { getBookedRanges } from "@/lib/availability"
import { isValidDateString, todayInDenmark } from "@/lib/booking-rules"
import { formatKr } from "@/lib/pricing"
import { BookingForm } from "@/components/booking-form"

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ start?: string; end?: string }> }

export default async function MachineBookingPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { start, end } = await searchParams
  const [item] = await db.select().from(machine).where(and(eq(machine.slug, slug), eq(machine.active, true))).limit(1)
  if (!item) notFound()
  const [user, bookedRanges, accessories, zones] = await Promise.all([
    getSessionUser(),
    getBookedRanges(item.slug),
    db.select().from(accessory).where(and(eq(accessory.machineId, item.id), eq(accessory.active, true))).orderBy(asc(accessory.name)),
    db.select().from(deliveryZone).where(eq(deliveryZone.active, true)),
  ])
  const today = todayInDenmark()
  const validPeriod = start && end && isValidDateString(start) && isValidDateString(end) && end >= start && start >= today
  const specs = Object.entries(item.specifications ?? {})

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
          <p className="eyebrow">Forespørgsel</p>
          <h2>Book maskinen</h2>
          <p className="muted">Udfyld formularen, så vender vi tilbage med endelig bekræftelse.</p>
          <BookingForm
            machine={{ slug: item.slug, name: item.name, dailyPrice: item.dailyPrice, deposit: item.deposit, deliveryAvailable: item.deliveryAvailable }}
            accessories={accessories.map((row) => ({ id: row.id, name: row.name, description: row.description, dailyPrice: row.dailyPrice, deposit: row.deposit }))}
            zones={zones.map((zone) => ({ id: zone.id, name: zone.name, postalCodes: zone.postalCodes, deliveryFee: zone.deliveryFee, collectionFee: zone.collectionFee }))}
            today={today}
            bookedRanges={bookedRanges}
            initialStart={validPeriod ? start : ""}
            initialEnd={validPeriod ? end : ""}
            loggedIn={Boolean(user)}
            defaultName={user?.name ?? ""}
            defaultEmail={user?.email ?? ""}
          />
        </section>
      </div>
    </main>
  )
}
