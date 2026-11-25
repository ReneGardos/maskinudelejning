import Link from "next/link"
import { ResetPasswordForm } from "@/components/password-forms"
export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) { const { token } = await searchParams; return <main className="auth-page"><div className="auth-card"><Link href="/" className="brand">maskin<span>udlejning</span></Link><p className="eyebrow">Kundeportal</p><h1>Vælg ny adgangskode</h1><ResetPasswordForm token={token ?? ""} /></div></main> }
