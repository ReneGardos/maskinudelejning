"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createBooking } from "@/app/actions/bookings"
import { isValidDateString, rangesOverlap, rentalDays } from "@/lib/booking-rules"

type Props = {
  machine: { slug: string; name: string; dailyPrice: number }
  today: string
  bookedRanges: Array<{ startDate: string; endDate: string }>
  initialStart: string
  initialEnd: string
  loggedIn: boolean
  defaultName: string
  defaultEmail: string
}

function formatDate(value: string) {
  const [y, m, d] = value.split("-")
  return `${d}.${m}.${y}`
}

export function BookingForm({ machine, today, bookedRanges, initialStart, initialEnd, loggedIn, defaultName, defaultEmail }: Props) {
  const router = useRouter()
  const [startDate, setStartDate] = useState(initialStart)
  const [endDate, setEndDate] = useState(initialEnd)
  const [delivery, setDelivery] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [pending, setPending] = useState(false)

  const validRange = isValidDateString(startDate) && isValidDateString(endDate) && endDate >= startDate
  const days = validRange ? rentalDays(startDate, endDate) : 0
  const total = days * machine.dailyPrice
  // Serveren og databasen tjekker altid selv. Dette er kun for at give besked, før formularen sendes.
  const clash = validRange && bookedRanges.some((range) => rangesOverlap(startDate, endDate, range.startDate, range.endDate))

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    setPending(true); setError(""); setSuccess("")
    const form = new FormData(formElement)
    try {
      const result = await createBooking({
        machineSlug: machine.slug,
        startDate,
        endDate,
        customerName: String(form.get("customerName") ?? ""),
        customerEmail: String(form.get("customerEmail") ?? ""),
        customerPhone: String(form.get("customerPhone") ?? ""),
        notes: String(form.get("notes") ?? ""),
        deliveryType: delivery ? "delivery" : "collection",
        deliveryAddress: String(form.get("deliveryAddress") ?? ""),
        deliveryPostalCode: String(form.get("deliveryPostalCode") ?? ""),
      })
      if (result.ok) {
        setSuccess(`Din forespørgsel er sendt (${result.days} ${result.days === 1 ? "dag" : "dage"}, ${result.total.toLocaleString("da-DK")} kr. ekskl. moms). Vi vender tilbage med en bekræftelse. Du kan følge status under Min konto.`)
        formElement.reset(); setStartDate(""); setEndDate(""); setDelivery(false)
        router.refresh()
      } else if (result.unauthorized) {
        router.push("/sign-in")
      } else {
        setError(result.error)
      }
    } catch {
      setError("Der opstod en fejl. Prøv igen om lidt.")
    } finally {
      setPending(false)
    }
  }

  return (
    <form className="booking-form" onSubmit={submit}>
      {!loggedIn && <p className="muted">Du skal være logget ind for at sende en forespørgsel. <Link href="/sign-in">Log ind</Link> eller <Link href="/sign-up">opret en konto</Link>.</p>}
      {bookedRanges.length > 0 && (
        <p className="muted"><strong>Allerede optaget:</strong> {bookedRanges.map((range) => range.startDate === range.endDate ? formatDate(range.startDate) : `${formatDate(range.startDate)} – ${formatDate(range.endDate)}`).join(" · ")}</p>
      )}
      <div className="form-row">
        <label>Fra<input type="date" required min={today} value={startDate} onChange={(e) => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(e.target.value) }} /></label>
        <label>Til<input type="date" required min={startDate || today} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
      </div>
      {clash && <p className="form-error" role="alert">Maskinen er optaget i hele eller dele af den periode. Vælg andre datoer.</p>}
      {days > 0 && !clash && <p className="muted"><strong>{days} {days === 1 ? "dag" : "dage"}</strong> × {machine.dailyPrice.toLocaleString("da-DK")} kr. = <strong>{total.toLocaleString("da-DK")} kr.</strong> ekskl. moms{delivery ? " (levering kommer oveni, prisen aftales)" : ""}</p>}
      <label>Navn<input name="customerName" required minLength={2} maxLength={100} autoComplete="name" defaultValue={defaultName} /></label>
      <label>Email<input name="customerEmail" type="email" required maxLength={254} autoComplete="email" defaultValue={defaultEmail} /></label>
      <label>Telefon<input name="customerPhone" type="tel" required autoComplete="tel" /></label>
      <div className="form-row">
        <label className="check"><input type="radio" name="deliveryChoice" checked={!delivery} onChange={() => setDelivery(false)} /> Afhentning hos os</label>
        <label className="check"><input type="radio" name="deliveryChoice" checked={delivery} onChange={() => setDelivery(true)} /> Levering til mig</label>
      </div>
      {delivery && (
        <div className="form-row">
          <label>Leveringsadresse<input name="deliveryAddress" required minLength={3} maxLength={200} autoComplete="street-address" /></label>
          <label>Postnummer<input name="deliveryPostalCode" required inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="postal-code" /></label>
        </div>
      )}
      <label>Besked <span className="muted">(valgfrit)</span><textarea name="notes" rows={3} maxLength={1000} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {success && <p className="success-message" role="status">{success}</p>}
      <button className="button button-dark" disabled={pending || clash}>{pending ? "Sender forespørgsel…" : "Send bookingforespørgsel"}</button>
    </form>
  )
}
