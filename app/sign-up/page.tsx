import Link from "next/link"
import { noIndex } from "@/lib/site"
import { AuthForm } from "@/components/auth-form"

export const metadata = { title: "Opret konto", ...noIndex }

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  const signIn = next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in"
  return <main className="auth-page"><div className="auth-card"><Link href="/" className="brand">maskin<span>udlejning</span></Link><p className="eyebrow">Kundeportal</p><h1>Opret din konto</h1><p className="muted">Gem dine oplysninger og hold styr på dine maskiner.</p><AuthForm mode="sign-up" next={next} /><p className="auth-switch">Har du allerede en konto? <Link href={signIn}>Log ind</Link></p></div></main>
}
