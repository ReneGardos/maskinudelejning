import Link from "next/link"
import { requireAdminPage } from "@/lib/session"
import { getAdminOrders } from "@/app/actions/bookings"
import { AdminBookings } from "@/components/admin-bookings"
import { AdminHeader } from "@/components/admin-header"
import { todayInDenmark } from "@/lib/booking-rules"
import { formatKr } from "@/lib/pricing"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const user = await requireAdminPage()
  const orders = await getAdminOrders()
  const today = todayInDenmark()
  const active = orders.filter((order) => order.status !== "cancelled")
  const pending = orders.filter((order) => order.status === "pending").length
  const outNow = active.flatMap((order) => order.lines).filter((line) => line.status !== "cancelled" && line.startDate <= today && line.endDate >= today).length
  const month = today.slice(0, 7)
  const monthTotal = active.filter((order) => order.createdAt.toISOString().slice(0, 7) === month).reduce((sum, order) => sum + order.total, 0)
  return (
    <main className="admin-page">
      <AdminHeader current="/admin" />
      <section className="admin-shell">
        <div className="admin-title"><div><p className="eyebrow">Driftscenter</p><h1>Bookinger</h1><p className="muted">Hej {user.name}. Her bekræfter og håndterer du alle bookinger.</p></div><Link href="/booking" className="button button-dark">Opret booking</Link></div>
        <div className="admin-stats">
          <div><span>Afventer svar</span><strong>{pending}</strong></div>
          <div><span>Maskiner ude i dag</span><strong>{outNow}</strong></div>
          <div><span>Booket denne måned</span><strong>{formatKr(monthTotal)}</strong></div>
        </div>
        <AdminBookings orders={orders.map((order) => ({
          id: order.id, orderNumber: order.orderNumber, createdAt: order.createdAt.toISOString(), status: order.status,
          customerName: order.customerName, customerEmail: order.customerEmail, customerPhone: order.customerPhone, company: order.company, notes: order.notes,
          deliveryType: order.deliveryType, deliveryAddress: order.deliveryAddress, deliveryPostalCode: order.deliveryPostalCode,
          deliveryFee: order.deliveryFee, subtotal: order.subtotal, discountAmount: order.discountAmount, discountLabel: order.discountLabel, total: order.total, deposit: order.deposit,
          lines: order.lines.map((line) => ({ id: line.id, machineName: line.machineName, startDate: line.startDate, endDate: line.endDate, total: line.total, items: line.items.map((row) => ({ name: row.name, quantity: row.quantity })) })),
        }))} />
      </section>
    </main>
  )
}
