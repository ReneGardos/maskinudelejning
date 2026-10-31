import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { getAdminBookings } from "@/app/actions/bookings"
import { AdminBookings } from "@/components/admin-bookings"

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/sign-in")
  const bookings = await getAdminBookings()
  const pending = bookings.filter((item) => item.status === "pending").length
  return <main className="admin-page"><header className="admin-header"><Link href="/" className="brand">maskin<span>udlejning</span></Link><div className="admin-header-actions"><span className="admin-badge">Administration</span><Link href="/min-konto" className="text-link">Min konto</Link></div></header><section className="admin-shell"><div className="admin-title"><div><p className="eyebrow">Driftscenter</p><h1>Bookingoverblik</h1><p className="muted">Hej {session.user.name}. Her håndterer du alle maskinbookinger.</p></div><Link href="/maskiner" className="button button-dark">Se katalog</Link></div><div className="admin-stats"><div><span>Alle bookinger</span><strong>{bookings.length}</strong></div><div><span>Afventer svar</span><strong>{pending}</strong></div><div><span>Bekræftede</span><strong>{bookings.filter((item) => item.status === "confirmed").length}</strong></div></div><AdminBookings bookings={bookings.map((item) => ({ id: item.id, customerName: item.customerName, customerEmail: item.customerEmail, machineName: item.machineName, startDate: item.startDate, endDate: item.endDate, status: item.status }))} /></section></main>
}
