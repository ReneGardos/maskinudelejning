import { asc } from "drizzle-orm"
import { requireAdminPage } from "@/lib/session"
import { db } from "@/lib/db"
import { accessory, machine } from "@/lib/db/schema"
import { AdminHeader } from "@/components/admin-header"
import { AdminMachines } from "@/components/admin-machines"

export const dynamic = "force-dynamic"

export default async function AdminMachinesPage() {
  await requireAdminPage()
  const [machines, accessories] = await Promise.all([
    db.select().from(machine).orderBy(asc(machine.name)),
    db.select().from(accessory).orderBy(asc(accessory.name)),
  ])
  return (
    <main className="admin-page">
      <AdminHeader current="/admin/maskiner" />
      <section className="admin-shell">
        <div className="admin-title"><div><p className="eyebrow">Katalog</p><h1>Maskiner og tilbehør</h1><p className="muted">Ændringer vises med det samme på sitet.</p></div></div>
        <AdminMachines machines={machines.map((item) => ({
          id: item.id, slug: item.slug, name: item.name, category: item.category, description: item.description,
          dailyPrice: item.dailyPrice, deposit: item.deposit, image: item.image, manufacturer: item.manufacturer, model: item.model,
          specifications: (item.specifications ?? {}) as Record<string, string>, active: item.active, deliveryAvailable: item.deliveryAvailable,
          accessories: accessories.filter((row) => row.machineId === item.id).map((row) => ({ id: row.id, name: row.name, description: row.description, dailyPrice: row.dailyPrice, deposit: row.deposit, active: row.active })),
        }))} />
      </section>
    </main>
  )
}
