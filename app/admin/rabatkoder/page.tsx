import { desc } from "drizzle-orm"
import { requireAdminPage } from "@/lib/session"
import { db } from "@/lib/db"
import { discountCode } from "@/lib/db/schema"
import { AdminHeader } from "@/components/admin-header"
import { AdminCodes } from "@/components/admin-codes"
import { todayInDenmark } from "@/lib/booking-rules"

export const dynamic = "force-dynamic"

export default async function AdminCodesPage() {
  await requireAdminPage()
  const codes = await db.select().from(discountCode).orderBy(desc(discountCode.createdAt))
  return (
    <main className="admin-page">
      <AdminHeader current="/admin/rabatkoder" />
      <section className="admin-shell">
        <div className="admin-title"><div><p className="eyebrow">Rabatter</p><h1>Rabatkoder</h1><p className="muted">Koder, kunden skriver på bookingsiden. Rabatten gives på leje og tilbehør, ikke på levering og depositum.</p></div></div>
        <AdminCodes today={todayInDenmark()} codes={codes.map((row) => ({ id: row.id, code: row.code, kind: row.kind, value: row.value, minSubtotal: row.minSubtotal, validFrom: row.validFrom, validUntil: row.validUntil, maxUses: row.maxUses, usedCount: row.usedCount, active: row.active, note: row.note }))} />
      </section>
    </main>
  )
}
