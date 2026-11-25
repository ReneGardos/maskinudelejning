"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { cancelMyOrder } from "@/app/actions/bookings"

export function CancelBookingButton({ id }: { id: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function cancel() {
    if (!window.confirm("Er du sikker på, at du vil annullere hele denne booking?")) return
    setPending(true); setError("")
    try {
      const result = await cancelMyOrder(id)
      if (result.ok) router.refresh()
      else if (result.unauthorized) router.push("/sign-in")
      else setError(result.error)
    } catch {
      setError("Der opstod en fejl. Prøv igen.")
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <button type="button" className="logout-button" onClick={cancel} disabled={pending}>{pending ? "Annullerer…" : "Annuller booking"}</button>
      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  )
}
