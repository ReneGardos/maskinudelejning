import Link from "next/link"
import { noIndex } from "@/lib/site"
import { AuthForm } from "@/components/auth-form"

export const metadata = { title: "Log ind", ...noIndex }

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams
  const signUp = next ? `/sign-up?next=${encodeURIComponent(next)}` : "/sign-up"
  return <main className="auth-page"><div className="auth-card"><Link href="/" className="brand">maskin<span>udlejning</span></Link><p className="eyebrow">Kundeportal</p><h1>Velkommen tilbage</h1><p className="muted">{next?.startsWith("/booking") ? "Log ind for at booke. Du kommer direkte tilbage til din booking." : "Log ind for at se dine bookinger."}</p><AuthForm mode="sign-in" next={next} /><p className="auth-switch">Har du ikke en konto? <Link href={signUp}>Opret en her</Link></p></div></main>
}
