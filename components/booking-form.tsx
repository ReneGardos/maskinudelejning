"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createBooking } from "@/app/actions/bookings"
import { isValidDateString, rangesOverlap, rentalDays } from "@/lib/booking-rules"
import { calculateQuote, findDeliveryZone, formatKr, type Zone } from "@/lib/pricing"

type Accessory = { id: string; name: string; description: string; dailyPrice: number; deposit: number }

type Props = {
  machine: { slug: string; name: string; dailyPrice: number; deposit: number; deliveryAvailable: boolean }
  accessories: Accessory[]
  zones: Zone[]
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

export function BookingForm({ machine, accessories, zones, today, bookedRanges, initialStart, initialEnd, loggedIn, defaultName, defaultEmail }: Props) {
  const router = useRouter()
  const [startDate, setStartDate] = useState(initialStart)
  const [endDate, setEndDate] = useState(initialEnd)
  const [delivery, setDelivery] = useState(false)
  const [postalCode, setPostalCode] = useState("")
  const [chosen, setChosen] = useState<Record<string, boolean>>({})
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [pending, setPending] = useState(false)

  const validRange = isValidDateString(startDate) && isValidDateString(endDate) && endDate >= startDate
  const days = validRange ? rentalDays(startDate, endDate) : 0
  // Serveren og databasen tjekker altid selv. Dette er kun for at give besked, før formularen sendes.
  const clash = validRange && bookedRanges.some((range) => rangesOverlap(startDate, endDate, range.startDate, range.endDate))

  const postalReady = /^\d{4}$/.test(postalCode)
  const zone = delivery && postalReady ? findDeliveryZone(zones, postalCode) : null
  const noZone = delivery && postalReady && !zone
  const selectedAccessories = accessories.filter((item) => chosen[item.id])
  const quote = calculateQuote({
    days,
    dailyPrice: machine.dailyPrice,
    machineDeposit: machine.deposit,
    delivery,
    zone,
    accessories: selectedAccessories.map((item) => ({ dailyPrice: item.dailyPrice, deposit: item.deposit, quantity: 1 })),
  })

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
        deliveryPostalCode: postalCode,
        accessories: selectedAccessories.map((item) => ({ id: item.id, quantity: 1 })),
        acceptTerms: accepted,
      })
      if (result.ok) {
        const deposit = result.deposit > 0 ? ` Depositum: ${formatKr(result.deposit)} (refunderes).` : ""
        setSuccess(`Din forespørgsel er sendt (${result.days} ${result.days === 1 ? "dag" : "dage"}, ${formatKr(result.total)} ekskl. moms).${deposit} Vi vender tilbage med en bekræftelse. Du kan følge status under Min konto.`)
        formElement.reset(); setStartDate(""); setEndDate(""); setDelivery(false); setPostalCode(""); setChosen({}); setAccepted(false)
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

      {accessories.length > 0 && (
        <fieldset className="form-fieldset">
          <legend>Tilbehør</legend>
          {accessories.map((item) => (
            <label className="check accessory-option" key={item.id}>
              <input type="checkbox" checked={Boolean(chosen[item.id])} onChange={(e) => setChosen((current) => ({ ...current, [item.id]: e.target.checked }))} />
              <span><strong>{item.name}</strong> · {formatKr(item.dailyPrice)} pr. dag{item.deposit > 0 ? ` · depositum ${formatKr(item.deposit)}` : ""}<small>{item.description}</small></span>
            </label>
          ))}
        </fieldset>
      )}

      <label>Navn<input name="customerName" required minLength={2} maxLength={100} autoComplete="name" defaultValue={defaultName} /></label>
      <label>Email<input name="customerEmail" type="email" required maxLength={254} autoComplete="email" defaultValue={defaultEmail} /></label>
      <label>Telefon<input name="customerPhone" type="tel" required autoComplete="tel" /></label>

      <fieldset className="form-fieldset">
        <legend>Levering</legend>
        <label className="check"><input type="radio" name="deliveryChoice" checked={!delivery} onChange={() => setDelivery(false)} /> Afhentning hos os</label>
        {machine.deliveryAvailable
          ? <label className="check"><input type="radio" name="deliveryChoice" checked={delivery} onChange={() => setDelivery(true)} /> Levering og afhentning hos mig</label>
          : <p className="muted">Denne maskine kan kun afhentes.</p>}
      </fieldset>
      {delivery && (
        <>
          <div className="form-row">
            <label>Leveringsadresse<input name="deliveryAddress" required minLength={3} maxLength={200} autoComplete="street-address" /></label>
            <label>Postnummer<input required inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="postal-code" value={postalCode} onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ""))} /></label>
          </div>
          {!postalReady && <p className="muted">Indtast postnummer for at se leveringsprisen.</p>}
          {zone && <p className="muted">Leveringszone: <strong>{zone.name}</strong></p>}
          {noZone && <p className="form-error" role="alert">Vi leverer desværre ikke til det postnummer. Kontakt os, eller vælg afhentning.</p>}
        </>
      )}

      {days > 0 && !clash && (
        <div className="quote-box" aria-live="polite">
          <div className="quote-line"><span>{machine.name} · {days} {days === 1 ? "dag" : "dage"} × {formatKr(machine.dailyPrice)}</span><span>{formatKr(quote.rental)}</span></div>
          {selectedAccessories.map((item) => (
            <div className="quote-line" key={item.id}><span>{item.name} · {days} {days === 1 ? "dag" : "dage"} × {formatKr(item.dailyPrice)}</span><span>{formatKr(days * item.dailyPrice)}</span></div>
          ))}
          {delivery && zone && <div className="quote-line"><span>Levering og afhentning ({zone.name})</span><span>{formatKr(quote.deliveryFee)}</span></div>}
          <div className="quote-line quote-total"><strong>I alt ekskl. moms</strong><strong>{formatKr(quote.total)}</strong></div>
          {quote.deposit > 0 && <div className="quote-line quote-deposit"><span>Depositum (refunderes ved aflevering i orden)</span><span>{formatKr(quote.deposit)}</span></div>}
        </div>
      )}

      <label>Besked <span className="muted">(valgfrit)</span><textarea name="notes" rows={3} maxLength={1000} /></label>
      <label className="check"><input type="checkbox" required checked={accepted} onChange={(e) => setAccepted(e.target.checked)} /> <span>Jeg har læst og accepterer <Link href="/handelsbetingelser" target="_blank" className="text-link">handelsbetingelserne</Link> og <Link href="/privatlivspolitik" target="_blank" className="text-link">privatlivspolitikken</Link>.</span></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {success && <p className="success-message" role="status">{success}</p>}
      <button className="button button-dark" disabled={pending || clash || noZone}>{pending ? "Sender forespørgsel…" : "Send bookingforespørgsel"}</button>
    </form>
  )
}
