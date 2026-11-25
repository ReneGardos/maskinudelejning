import { and, asc, eq, gte, ne, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { accessory, booking, deliveryZone, machine } from "@/lib/db/schema"
import { todayInDenmark } from "@/lib/booking-rules"
import type { Zone } from "@/lib/pricing"

export type CatalogMachine = {
  id: string; slug: string; name: string; category: string; description: string; image: string
  dailyPrice: number; deposit: number; deliveryAvailable: boolean
  specs: Array<[string, string]>
  accessoryCount: number
  bookedRanges: Array<{ startDate: string; endDate: string }>
}

/** Alle aktive maskiner med optagede perioder (kun datoer, ingen kundedata) og aktive leveringszoner. */
export async function getCatalog(): Promise<{ machines: CatalogMachine[]; zones: Zone[]; today: string }> {
  const today = todayInDenmark()
  const [machines, ranges, accessoryCounts, zones] = await Promise.all([
    db.select().from(machine).where(eq(machine.active, true)).orderBy(asc(machine.category), asc(machine.name)),
    db.select({ slug: booking.machineSlug, startDate: booking.startDate, endDate: booking.endDate }).from(booking).where(and(ne(booking.status, "cancelled"), gte(booking.endDate, today))).orderBy(asc(booking.startDate)),
    db.select({ machineId: accessory.machineId, count: sql<number>`count(*)::int` }).from(accessory).where(eq(accessory.active, true)).groupBy(accessory.machineId),
    db.select().from(deliveryZone).where(eq(deliveryZone.active, true)),
  ])
  return {
    today,
    zones: zones.map((zone) => ({ id: zone.id, name: zone.name, postalCodes: zone.postalCodes, deliveryFee: zone.deliveryFee, collectionFee: zone.collectionFee })),
    machines: machines.map((row) => ({
      id: row.id, slug: row.slug, name: row.name, category: row.category, description: row.description, image: row.image,
      dailyPrice: row.dailyPrice, deposit: row.deposit, deliveryAvailable: row.deliveryAvailable,
      specs: Object.entries((row.specifications ?? {}) as Record<string, string>).map(([key, value]) => [key.charAt(0).toUpperCase() + key.slice(1), value] as [string, string]),
      accessoryCount: accessoryCounts.find((item) => item.machineId === row.id)?.count ?? 0,
      bookedRanges: ranges.filter((range) => range.slug === row.slug).map((range) => ({ startDate: range.startDate, endDate: range.endDate })),
    })),
  }
}
