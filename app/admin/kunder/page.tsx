import { desc, sql } from "drizzle-orm"
import { requireAdminPage } from "@/lib/session"
import { db } from "@/lib/db"
import { bookingOrder, customerDiscount, user } from "@/lib/db/schema"
import { AdminHeader } from "@/components/admin-header"
import { AdminCustomers } from "@/components/admin-customers"

export const dynamic = "force-dynamic"

export default async function AdminCustomersPage() {
  await requireAdminPage()
  const [users, stats, discounts] = await Promise.all([
    db.select({ id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt }).from(user).orderBy(desc(user.createdAt)),
    db.select({
      userId: bookingOrder.userId,
      orders: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${bookingOrder.total}) filter (where ${bookingOrder.status} <> 'cancelled'), 0)::int`,
      lastOrder: sql<string>`max(${bookingOrder.createdAt})::text`,
      phone: sql<string | null>`(array_agg(${bookingOrder.customerPhone} order by ${bookingOrder.createdAt} desc))[1]`,
      company: sql<string | null>`(array_agg(${bookingOrder.company} order by ${bookingOrder.createdAt} desc) filter (where ${bookingOrder.company} is not null))[1]`,
    }).from(bookingOrder).groupBy(bookingOrder.userId),
    db.select().from(customerDiscount),
  ])
  return (
    <main className="admin-page">
      <AdminHeader current="/admin/kunder" />
      <section className="admin-shell">
        <div className="admin-title"><div><p className="eyebrow">Kunder</p><h1>Kunder og rabatter</h1><p className="muted">Giv faste kunder en procentrabat. Den bruges automatisk, når de booker, medmindre en rabatkode giver mere.</p></div></div>
        <AdminCustomers customers={users.map((row) => {
          const stat = stats.find((item) => item.userId === row.id)
          const discount = discounts.find((item) => item.userId === row.id)
          return {
            id: row.id, name: row.name, email: row.email, isAdmin: row.role === "admin", createdAt: row.createdAt.toISOString(),
            orders: stat?.orders ?? 0, revenue: stat?.revenue ?? 0, lastOrder: stat?.lastOrder ?? null, phone: stat?.phone ?? null, company: stat?.company ?? null,
            percent: discount?.percent ?? 0, note: discount?.note ?? "",
          }
        })} />
      </section>
    </main>
  )
}
