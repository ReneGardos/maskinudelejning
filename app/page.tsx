import { asc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { machine } from "@/lib/db/schema"
import HomePage, { type HomeMachine } from "@/components/home-page"

export const dynamic = "force-dynamic"

export default async function Page() {
  const rows = await db.select().from(machine).where(eq(machine.active, true)).orderBy(asc(machine.dailyPrice)).limit(3)
  const machines: HomeMachine[] = rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    type: row.category,
    price: row.dailyPrice,
    image: row.image,
    specs: Object.values((row.specifications ?? {}) as Record<string, string>).slice(0, 2).join(" · "),
  }))
  return <HomePage machines={machines} />
}
