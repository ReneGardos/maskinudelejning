import Link from "next/link"
import { AuthForm } from "@/components/auth-form"
export default function SignUpPage() { return <main className="auth-page"><div className="auth-card"><Link href="/" className="brand">maskin<span>udlejning</span></Link><p className="eyebrow">Kundeportal</p><h1>Opret din konto</h1><p className="muted">Gem dine oplysninger og hold styr på dine maskiner.</p><AuthForm mode="sign-up" /><p className="auth-switch">Har du allerede en konto? <Link href="/sign-in">Log ind</Link></p></div></main> }
