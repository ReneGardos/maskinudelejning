import Link from "next/link"
import { redirect } from "next/navigation"
import { and, asc, desc, eq, gte, ne } from "drizzle-orm"
import { db } from "@/lib/db"
import { accessory, booking, bookingOrder, customerDiscount, deliveryZone, machine } from "@/lib/db/schema"
import { getSessionUser } from "@/lib/session"
import { isValidDateString, todayInDenmark } from "@/lib/booking-rules"
import { OrderForm } from "@/components/order-form"
import { noIndex } from "@/lib/site"

export const dynamic = "force-dynamic"
export const metadata = { title: "Ny booking", ...noIndex }

type Props = { searchParams: Promise<{ maskine?: string; start?: string; end?: string; levering?: string; postnr?: string }> }

export default async function BookingPage({ searchParams }: Props) {
  const { maskine, start, end, levering, postnr } = await searchParams
  const user = await getSessionUser()
  if (!user) {
    const query = new URLSearchParams(Object.entries({ maskine, start, end, levering, postnr }).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1] !== "")).toString()
    redirect(`/sign-in?next=${encodeURIComponent(`/booking${query ? `?${query}` : ""}`)}`)
  }

  const today = todayInDenmark()
  const [machines, accessories, ranges, zones, discount, lastOrder] = await Promise.all([
    db.select().from(machine).where(eq(machine.active, true)).orderBy(asc(machine.category), asc(machine.name)),
    db.select().from(accessory).where(eq(accessory.active, true)).orderBy(asc(accessory.name)),
    // Kun datoer, ingen kundeoplysninger.
    db.select({ slug: booking.machineSlug, startDate: booking.startDate, endDate: booking.endDate }).from(booking).where(and(ne(booking.status, "cancelled"), gte(booking.endDate, today))).orderBy(asc(booking.startDate)),
    db.select().from(deliveryZone).where(eq(deliveryZone.active, true)),
    db.select({ percent: customerDiscount.percent }).from(customerDiscount).where(eq(customerDiscount.userId, user.id)).limit(1),
    db.select({ phone: bookingOrder.customerPhone, company: bookingOrder.company }).from(bookingOrder).where(eq(bookingOrder.userId, user.id)).orderBy(desc(bookingOrder.createdAt)).limit(1),
  ])

  const validPeriod = start && end && isValidDateString(start) && isValidDateString(end) && end >= start && start >= today

  return (
    <main className="order-page">
      <header className="account-header">
        <Link href="/" className="brand">maskin<span>udlejning</span></Link>
        <div><Link href="/maskiner" className="text-link">Katalog</Link><Link href="/min-konto" className="text-link">Min konto</Link></div>
      </header>
      <section className="order-shell">
        <p className="eyebrow">Booking</p>
        <h1>Ny booking</h1>
        <p className="lead">Book en eller flere maskiner på én gang. Du ser den samlede pris, før du sender.</p>
        {machines.length === 0 ? <div className="empty-state"><h2>Ingen maskiner kan bookes lige nu</h2><p className="muted">Kontakt os, så hjælper vi.</p></div> : (
          <OrderForm
            machines={machines.map((item) => ({
              slug: item.slug, name: item.name, category: item.category, image: item.image, dailyPrice: item.dailyPrice, deposit: item.deposit, deliveryAvailable: item.deliveryAvailable,
              accessories: accessories.filter((row) => row.machineId === item.id).map((row) => ({ id: row.id, name: row.name, description: row.description, dailyPrice: row.dailyPrice, deposit: row.deposit })),
              bookedRanges: ranges.filter((range) => range.slug === item.slug).map((range) => ({ startDate: range.startDate, endDate: range.endDate })),
            }))}
            zones={zones.map((zone) => ({ id: zone.id, name: zone.name, postalCodes: zone.postalCodes, deliveryFee: zone.deliveryFee, collectionFee: zone.collectionFee }))}
            today={today}
            customerPercent={discount[0]?.percent ?? 0}
            initialSlug={maskine ?? ""}
            initialStart={validPeriod ? start : ""}
            initialEnd={validPeriod ? end : ""}
            initialDelivery={levering === "1"}
            initialPostalCode={postnr && /^\d{4}$/.test(postnr) ? postnr : ""}
            defaults={{ name: user.name, email: user.email, phone: lastOrder[0]?.phone ?? "", company: lastOrder[0]?.company ?? "" }}
          />
        )}
      </section>
    </main>
  )
}
