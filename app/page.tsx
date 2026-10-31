import { db } from "@/lib/db"
import { machine } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import Home from "@/components/home-client"

export default async function Page() {
  const machines = await db.select({ id: machine.id, slug: machine.slug, name: machine.name, category: machine.category, dailyPrice: machine.dailyPrice, image: machine.image, specifications: machine.specifications }).from(machine).where(eq(machine.active, true))
  return <Home machines={machines} />
}
