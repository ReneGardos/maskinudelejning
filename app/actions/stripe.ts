"use server"

import { headers } from "next/headers"
import { and, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { booking } from "@/lib/db/schema"
import { stripe } from "@/lib/stripe"

export async function startBookingCheckout(bookingId: string) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  const result = await db.select().from(booking).where(and(eq(booking.id, bookingId), eq(booking.userId, session.user.id))).limit(1)
  const current = result[0]
  if (!current) throw new Error("Booking ikke fundet")
  if (current.status === "cancelled") throw new Error("En annulleret booking kan ikke betales")
  if (!current.total || current.total <= 0) throw new Error("Bookingens total er ikke klar")
  const checkout = await stripe.checkout.sessions.create({ ui_mode: "embedded_page", redirect_on_completion: "never", mode: "payment", metadata: { bookingId: current.id, userId: session.user.id }, line_items: [{ price_data: { currency: "dkk", product_data: { name: `Maskinleje: ${current.machineName}`, description: `${current.startDate} – ${current.endDate}` }, unit_amount: current.total * 100 }, quantity: 1 }] })
  return checkout.client_secret
}
