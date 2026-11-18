import { and, asc, eq, gte, lte, ne } from "drizzle-orm"
import { db } from "@/lib/db"
import { booking } from "@/lib/db/schema"
import { todayInDenmark } from "@/lib/booking-rules"

/** Fremtidige, aktive bookinger for én maskine (kun datoer, ingen kundeoplysninger). */
export async function getBookedRanges(machineSlug: string) {
  return db
    .select({ startDate: booking.startDate, endDate: booking.endDate })
    .from(booking)
    .where(and(eq(booking.machineSlug, machineSlug), ne(booking.status, "cancelled"), gte(booking.endDate, todayInDenmark())))
    .orderBy(asc(booking.startDate))
}

/** Slugs på maskiner, der er optaget mindst én dag i perioden (begge ender inklusive). */
export async function getBusyMachineSlugs(startDate: string, endDate: string) {
  const rows = await db
    .selectDistinct({ slug: booking.machineSlug })
    .from(booking)
    .where(and(ne(booking.status, "cancelled"), lte(booking.startDate, endDate), gte(booking.endDate, startDate)))
  return new Set(rows.map((row) => row.slug))
}
