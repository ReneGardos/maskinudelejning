import Link from "next/link"
import { AuthForm } from "@/components/auth-form"
export default function SignInPage() { return <main className="auth-page"><div className="auth-card"><Link href="/" className="brand">maskin<span>udlejning</span></Link><p className="eyebrow">Kundeportal</p><h1>Velkommen tilbage</h1><p className="muted">Log ind for at se dine bookinger og gemte maskiner.</p><AuthForm mode="sign-in" /><p className="auth-switch">Har du ikke en konto? <Link href="/sign-up">Opret en her</Link></p></div></main> }
