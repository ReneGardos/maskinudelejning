import Link from "next/link"
import { requireAdminPage } from "@/lib/session"
import { getAdminBookings } from "@/app/actions/bookings"
import { AdminBookings } from "@/components/admin-bookings"
import { AdminHeader } from "@/components/admin-header"

export default async function AdminPage() {
  const user = await requireAdminPage()
  const bookings = await getAdminBookings()
  const pending = bookings.filter((item) => item.status === "pending").length
  return (
    <main className="admin-page">
      <AdminHeader current="/admin" />
      <section className="admin-shell">
        <div className="admin-title"><div><p className="eyebrow">Driftscenter</p><h1>Bookingoverblik</h1><p className="muted">Hej {user.name}. Her håndterer du alle maskinbookinger.</p></div><Link href="/maskiner" className="button button-dark">Se katalog</Link></div>
        <div className="admin-stats"><div><span>Alle bookinger</span><strong>{bookings.length}</strong></div><div><span>Afventer svar</span><strong>{pending}</strong></div><div><span>Bekræftede</span><strong>{bookings.filter((item) => item.status === "confirmed").length}</strong></div></div>
        <AdminBookings bookings={bookings.map((item) => ({
          id: item.id, customerName: item.customerName, customerEmail: item.customerEmail, customerPhone: item.customerPhone, notes: item.notes,
          deliveryType: item.deliveryType, deliveryAddress: item.deliveryAddress, deliveryPostalCode: item.deliveryPostalCode, deliveryFee: item.deliveryFee, deposit: item.deposit,
          machineName: item.machineName, startDate: item.startDate, endDate: item.endDate, total: item.total, status: item.status,
          items: item.items.map((row) => ({ name: row.name, quantity: row.quantity })),
        }))} />
      </section>
    </main>
  )
}
