import { notFound } from "next/navigation"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { accessory, machine } from "@/lib/db/schema"
import MachineBookingPage from "@/components/machine-booking-client"

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const result = await db.select({ id: machine.id, name: machine.name, slug: machine.slug, category: machine.category, description: machine.description, dailyPrice: machine.dailyPrice, image: machine.image, specifications: machine.specifications, active: machine.active }).from(machine).where(eq(machine.slug, slug)).limit(1)
  if (!result[0] || !result[0].active) notFound()
  const accessories = await db.select({ id: accessory.id, name: accessory.name, description: accessory.description, dailyPrice: accessory.dailyPrice }).from(accessory).where(eq(accessory.machineId, result[0].id))
  return <MachineBookingPage machine={result[0]} accessories={accessories} />
}
