import Link from "next/link"
import { LogoutButton } from "@/components/logout-button"

const links = [
  { href: "/admin", label: "Bookinger" },
  { href: "/admin/maskiner", label: "Maskiner" },
  { href: "/admin/zoner", label: "Leveringszoner" },
]

export function AdminHeader({ current }: { current: string }) {
  return (
    <header className="admin-header-wrap">
      <div className="admin-header">
        <Link href="/" className="brand">maskin<span>udlejning</span></Link>
        <div className="admin-header-actions"><span className="admin-badge">Administration</span><Link href="/min-konto" className="text-link">Min konto</Link><LogoutButton /></div>
      </div>
      <nav className="admin-nav" aria-label="Administration">
        {links.map((link) => <Link key={link.href} href={link.href} className={link.href === current ? "active" : undefined} aria-current={link.href === current ? "page" : undefined}>{link.label}</Link>)}
      </nav>
    </header>
  )
}
