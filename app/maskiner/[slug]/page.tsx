import Link from "next/link"
import { notFound } from "next/navigation"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { machine } from "@/lib/db/schema"
import { getSessionUser } from "@/lib/session"
import { getBookedRanges } from "@/lib/availability"
import { isValidDateString, todayInDenmark } from "@/lib/booking-rules"
import { BookingForm } from "@/components/booking-form"

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ start?: string; end?: string }> }

export default async function MachineBookingPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { start, end } = await searchParams
  const [item] = await db.select().from(machine).where(and(eq(machine.slug, slug), eq(machine.active, true))).limit(1)
  if (!item) notFound()
  const [user, bookedRanges] = await Promise.all([getSessionUser(), getBookedRanges(item.slug)])
  const today = todayInDenmark()
  const validPeriod = start && end && isValidDateString(start) && isValidDateString(end) && end >= start && start >= today

  return (
    <main className="booking-page">
      <Link href="/maskiner" className="back-link">← Tilbage til maskiner</Link>
      <div className="booking-layout">
        <section className="booking-intro">
          <p className="eyebrow">{item.category}</p>
          <h1>{item.name}</h1>
          <p className="lead">{item.description}</p>
          <div className="machine-specs"><span><strong>{item.dailyPrice.toLocaleString("da-DK")} kr.</strong> pr. dag ekskl. moms</span></div>
          <img src={item.image} alt={item.name} />
        </section>
        <section className="booking-card">
          <p className="eyebrow">Forespørgsel</p>
          <h2>Book maskinen</h2>
          <p className="muted">Udfyld formularen, så vender vi tilbage med endelig bekræftelse.</p>
          <BookingForm
            machine={{ slug: item.slug, name: item.name, dailyPrice: item.dailyPrice }}
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
