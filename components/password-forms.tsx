"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("")
    const email = String(new FormData(event.currentTarget).get("email"))
    try {
      await authClient.requestPasswordReset({ email, redirectTo: "/nulstil-adgangskode" })
      setDone(true)
    } catch { setError("Der opstod en fejl. Prøv igen.") }
    setPending(false)
  }
  if (done) return <p className="muted">Hvis der findes en konto med den e-mail, har vi sendt et link til at vælge en ny adgangskode. Linket virker i 1 time.</p>
  return <form className="auth-form" onSubmit={submit}><label>Email<input name="email" type="email" required autoComplete="email" /></label>{error && <p className="form-error">{error}</p>}<button className="button button-dark" disabled={pending}>{pending ? "Sender…" : "Send link"}</button></form>
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("")
    const form = new FormData(event.currentTarget)
    const password = String(form.get("password"))
    if (password !== String(form.get("confirm"))) { setError("De to adgangskoder er ikke ens."); setPending(false); return }
    const result = await authClient.resetPassword({ newPassword: password, token })
    setPending(false)
    if (result.error) setError("Linket er udløbet eller ugyldigt. Bed om et nyt.")
    else { setDone(true); setTimeout(() => router.push("/sign-in"), 1500) }
  }
  if (!token) return <p className="form-error">Linket er ugyldigt. <Link href="/glemt-adgangskode">Bed om et nyt</Link>.</p>
  if (done) return <p className="muted">Din adgangskode er ændret. Du sendes til login…</p>
  return <form className="auth-form" onSubmit={submit}><label>Ny adgangskode<input name="password" type="password" minLength={8} required autoComplete="new-password" /></label><label>Gentag adgangskode<input name="confirm" type="password" minLength={8} required autoComplete="new-password" /></label>{error && <p className="form-error">{error}</p>}<button className="button button-dark" disabled={pending}>{pending ? "Gemmer…" : "Gem adgangskode"}</button></form>
}

export function ProfileForms({ name, email }: { name: string; email: string }) {
  const router = useRouter()
  const [nameState, setNameState] = useState({ pending: false, msg: "", error: "" })
  const [pwState, setPwState] = useState({ pending: false, msg: "", error: "" })
  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNameState({ pending: true, msg: "", error: "" })
    const result = await authClient.updateUser({ name: String(new FormData(event.currentTarget).get("name")).trim() })
    if (result.error) setNameState({ pending: false, msg: "", error: "Kunne ikke gemme navnet." })
    else { setNameState({ pending: false, msg: "Gemt", error: "" }); router.refresh() }
  }
  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formEl = event.currentTarget
    const form = new FormData(formEl)
    setPwState({ pending: true, msg: "", error: "" })
    const result = await authClient.changePassword({ currentPassword: String(form.get("current")), newPassword: String(form.get("next")), revokeOtherSessions: true })
    if (result.error) setPwState({ pending: false, msg: "", error: "Kunne ikke ændre adgangskoden. Tjek din nuværende adgangskode." })
    else { formEl.reset(); setPwState({ pending: false, msg: "Adgangskoden er ændret", error: "" }) }
  }
  return (
    <>
      <form className="auth-form" onSubmit={saveName}>
        <h2>Oplysninger</h2>
        <label>Navn<input name="name" defaultValue={name} required minLength={2} maxLength={100} autoComplete="name" /></label>
        <label>Email<input value={email} disabled readOnly /></label>
        {nameState.error && <p className="form-error">{nameState.error}</p>}{nameState.msg && <p className="muted">{nameState.msg}</p>}
        <button className="button button-dark" disabled={nameState.pending}>Gem navn</button>
      </form>
      <form className="auth-form" onSubmit={savePassword}>
        <h2>Skift adgangskode</h2>
        <label>Nuværende adgangskode<input name="current" type="password" required autoComplete="current-password" /></label>
        <label>Ny adgangskode<input name="next" type="password" minLength={8} required autoComplete="new-password" /></label>
        {pwState.error && <p className="form-error">{pwState.error}</p>}{pwState.msg && <p className="muted">{pwState.msg}</p>}
        <button className="button button-dark" disabled={pwState.pending}>Skift adgangskode</button>
      </form>
    </>
  )
}
