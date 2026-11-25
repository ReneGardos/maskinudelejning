import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { getMyOrders } from "@/app/actions/bookings"
import { LogoutButton } from "@/components/logout-button"
import { CancelBookingButton } from "@/components/cancel-booking-button"
import { canCancelOrder } from "@/lib/booking-rules"
import { formatKr, formatOrderNumber } from "@/lib/pricing"

const statusLabel = (status: string) => status === "pending" ? "Afventer" : status === "confirmed" ? "Bekræftet" : "Annulleret"
const formatDate = (value: string) => value.split("-").reverse().join(".")

export default async function AccountPage() {
  const user = await getSessionUser()
  if (!user) redirect("/sign-in?next=/min-konto")
  const orders = await getMyOrders()
  return (
    <main className="account-page">
      <header className="account-header">
        <Link href="/" className="brand">maskin<span>udlejning</span></Link>
        <div>
          <span className="muted">Hej, {user.name}</span>
          {user.role === "admin" && <Link href="/admin" className="text-link">Administration</Link>}
          <Link href="/min-konto/profil" className="text-link">Profil</Link>
          <Link href="/booking" className="button button-dark">Ny booking</Link>
          <LogoutButton />
        </div>
      </header>
      <section className="account-shell">
        <p className="eyebrow">Min konto</p>
        <h1>Dine bookinger</h1>
        <p className="lead">Status, maskiner og priser for dine bookinger.</p>
        {orders.length === 0 ? (
          <div className="empty-state"><h2>Ingen bookinger endnu</h2><p className="muted">Book en eller flere maskiner på én gang.</p><Link href="/booking" className="button button-dark">Ny booking</Link></div>
        ) : (
          <div className="booking-list">
            {orders.map((order) => (
              <article className="order-card" key={order.id}>
                <header className="order-card-head">
                  <div><p className="eyebrow">Booking {formatOrderNumber(order.orderNumber)}</p><small className="muted">Sendt {order.createdAt.toLocaleDateString("da-DK")}</small></div>
                  <span className={`status status-${order.status}`}>{statusLabel(order.status)}</span>
                </header>
                <ul className="order-card-lines">
                  {order.lines.map((line) => (
                    <li key={line.id}>
                      <div><strong>{line.machineName}</strong><small>{formatDate(line.startDate)} – {formatDate(line.endDate)}{line.items.length ? ` · ${line.items.map((item) => `${item.quantity} × ${item.name}`).join(", ")}` : ""}</small></div>
                      <span>{formatKr(line.total)}</span>
                    </li>
                  ))}
                </ul>
                <div className="order-card-foot">
                  <div className="muted">
                    <div>{order.deliveryType === "delivery" ? `Levering til ${order.deliveryAddress}, ${order.deliveryPostalCode}${order.deliveryFee > 0 ? ` · ${formatKr(order.deliveryFee)}` : ""}` : "Afhentning hos os"}</div>
                    {order.discountAmount > 0 && <div>Rabat: −{formatKr(order.discountAmount)}{order.discountLabel ? ` (${order.discountLabel})` : ""}</div>}
                    {order.deposit > 0 && <div>Depositum {formatKr(order.deposit)} opkræves separat</div>}
                  </div>
                  <div className="order-card-total"><small>I alt ekskl. moms</small><strong>{formatKr(order.total)}</strong>{canCancelOrder(order.lines) && order.status !== "cancelled" && <CancelBookingButton id={order.id} />}</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
