import Link from "next/link"
import { ForgotPasswordForm } from "@/components/password-forms"
export default function ForgotPage() { return <main className="auth-page"><div className="auth-card"><Link href="/" className="brand">maskin<span>udlejning</span></Link><p className="eyebrow">Kundeportal</p><h1>Glemt adgangskode</h1><p className="muted">Skriv din e-mail, så sender vi et link til at vælge en ny.</p><ForgotPasswordForm /><p className="auth-switch"><Link href="/sign-in">Tilbage til login</Link></p></div></main> }
