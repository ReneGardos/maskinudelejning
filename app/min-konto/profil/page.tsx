import Link from "next/link"
import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { ProfileForms } from "@/components/password-forms"
export default async function ProfilePage() { const user = await getSessionUser(); if (!user) redirect("/sign-in"); return <main className="account-page"><header className="account-header"><Link href="/" className="brand">maskin<span>udlejning</span></Link><div><Link href="/min-konto" className="text-link">Mine bookinger</Link></div></header><section className="account-shell"><p className="eyebrow">Min konto</p><h1>Profil</h1><ProfileForms name={user.name} email={user.email} /></section></main> }
