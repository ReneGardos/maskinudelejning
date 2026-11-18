import Link from "next/link"
import { notFound } from "next/navigation"
import { and, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { machine } from "@/lib/db/schema"
import { getSessionUser } from "@/lib/session"
import { todayInDenmark } from "@/lib/booking-rules"
import { BookingForm } from "@/components/booking-form"

export default async function MachineBookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [item] = await db.select().from(machine).where(and(eq(machine.slug, slug), eq(machine.active, true))).limit(1)
  if (!item) notFound()
  const user = await getSessionUser()

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
            today={todayInDenmark()}
            loggedIn={Boolean(user)}
            defaultName={user?.name ?? ""}
            defaultEmail={user?.email ?? ""}
          />
        </section>
      </div>
    </main>
  )
}
