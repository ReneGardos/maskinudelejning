"use client"

import { FormEvent, useState } from "react"
import { authClient } from "@/lib/auth-client"
import Link from "next/link"
import { useRouter } from "next/navigation"

export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("")
    const form = new FormData(event.currentTarget)
    const result = mode === "sign-up" ? await authClient.signUp.email({ name: String(form.get("name")), email: String(form.get("email")), password: String(form.get("password")) }) : await authClient.signIn.email({ email: String(form.get("email")), password: String(form.get("password")) })
    setPending(false)
    if (result.error) setError("Kunne ikke logge ind. Tjek dine oplysninger og prøv igen.")
    else { router.push("/min-konto"); router.refresh() }
  }
  return <form className="auth-form" onSubmit={submit}>{mode === "sign-up" && <label>Navn<input name="name" required autoComplete="name" /></label>}<label>Email<input name="email" type="email" required autoComplete="email" /></label><label>Adgangskode<input name="password" type="password" minLength={8} required autoComplete={mode === "sign-up" ? "new-password" : "current-password"} /></label>{mode === "sign-in" && <p className="auth-switch"><Link href="/glemt-adgangskode">Glemt adgangskode?</Link></p>}{mode === "sign-up" && <p className="muted">Ved at oprette en konto accepterer du vores <Link href="/privatlivspolitik">privatlivspolitik</Link> og <Link href="/handelsbetingelser">handelsbetingelser</Link>.</p>}{error && <p className="form-error">{error}</p>}<button className="button button-dark" disabled={pending}>{pending ? "Arbejder…" : mode === "sign-up" ? "Opret konto" : "Log ind"}</button></form>
}
