import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { getAdminBookings } from "@/app/actions/bookings"
import { AdminBookings } from "@/components/admin-bookings"
import { LogoutButton } from "@/components/logout-button"

export default async function AdminPage() {
  const user = await getSessionUser()
  if (!user) redirect("/sign-in")
  if (user.role !== "admin") redirect("/min-konto")
  const bookings = await getAdminBookings()
  const pending = bookings.filter((item) => item.status === "pending").length
  return <main className="admin-page"><header className="admin-header"><Link href="/" className="brand">maskin<span>udlejning</span></Link><div className="admin-header-actions"><span className="admin-badge">Administration</span><Link href="/min-konto" className="text-link">Min konto</Link><LogoutButton /></div></header><section className="admin-shell"><div className="admin-title"><div><p className="eyebrow">Driftscenter</p><h1>Bookingoverblik</h1><p className="muted">Hej {user.name}. Her håndterer du alle maskinbookinger.</p></div><Link href="/maskiner" className="button button-dark">Se katalog</Link></div><div className="admin-stats"><div><span>Alle bookinger</span><strong>{bookings.length}</strong></div><div><span>Afventer svar</span><strong>{pending}</strong></div><div><span>Bekræftede</span><strong>{bookings.filter((item) => item.status === "confirmed").length}</strong></div></div><AdminBookings bookings={bookings.map((item) => ({ id: item.id, customerName: item.customerName, customerEmail: item.customerEmail, customerPhone: item.customerPhone, notes: item.notes, machineName: item.machineName, startDate: item.startDate, endDate: item.endDate, total: item.total, status: item.status }))} /></section></main>
}
