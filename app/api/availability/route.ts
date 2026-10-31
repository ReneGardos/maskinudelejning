import { NextResponse } from "next/server"
import { and, eq, gt, lt, ne } from "drizzle-orm"
import { db } from "@/lib/db"
import { booking, machine } from "@/lib/db/schema"

export async function GET(request: Request) {
  const url = new URL(request.url); const slug = url.searchParams.get("slug"); const start = url.searchParams.get("start"); const end = url.searchParams.get("end")
  if (!start || !end || end < start) return NextResponse.json({ error: "Ugyldig periode" }, { status: 400 })
  const items = await db.select({ slug: booking.machineSlug }).from(machine).leftJoin(booking, and(eq(booking.machineSlug, machine.slug), ne(booking.status, "cancelled"), lt(booking.startDate, end), gt(booking.endDate, start))).where(eq(machine.active, true))
  const blocked = new Set(items.filter((item) => item.slug).map((item) => item.slug))
  const machines = await db.select({ slug: machine.slug }).from(machine).where(eq(machine.active, true))
  const available = machines.filter((item) => !blocked.has(item.slug)).map((item) => item.slug)
  return NextResponse.json({ available: slug ? available.includes(slug) : available, unavailable: [...blocked] })
}
