import { asc } from "drizzle-orm"
import { requireAdminPage } from "@/lib/session"
import { db } from "@/lib/db"
import { deliveryZone } from "@/lib/db/schema"
import { AdminHeader } from "@/components/admin-header"
import { AdminZones } from "@/components/admin-zones"

export const dynamic = "force-dynamic"

export default async function AdminZonesPage() {
  await requireAdminPage()
  const zones = await db.select().from(deliveryZone).orderBy(asc(deliveryZone.name))
  return (
    <main className="admin-page">
      <AdminHeader current="/admin/zoner" />
      <section className="admin-shell">
        <div className="admin-title"><div><p className="eyebrow">Levering</p><h1>Leveringszoner</h1><p className="muted">Priser for levering og afhentning pr. postnummer. Brug * som sidste zone for alle øvrige områder.</p></div></div>
        <AdminZones zones={zones.map((zone) => ({ id: zone.id, name: zone.name, postalCodes: zone.postalCodes, deliveryFee: zone.deliveryFee, collectionFee: zone.collectionFee, active: zone.active }))} />
      </section>
    </main>
  )
}
