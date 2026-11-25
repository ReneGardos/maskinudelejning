"use client"

import { FormEvent, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { checkDiscountCode, createOrder } from "@/app/actions/bookings"
import { isValidDateString, MAX_ORDER_LINES, rangesOverlap, rentalDays } from "@/lib/booking-rules"
import { calculateOrder, type DiscountCodeRule, findDeliveryZone, formatKr, formatOrderNumber, type Zone } from "@/lib/pricing"

export type OrderAccessory = { id: string; name: string; description: string; dailyPrice: number; deposit: number }
export type OrderMachine = {
  slug: string; name: string; category: string; image: string; dailyPrice: number; deposit: number; deliveryAvailable: boolean
  accessories: OrderAccessory[]
  bookedRanges: Array<{ startDate: string; endDate: string }>
}

type Line = { key: string; slug: string; ownPeriod: boolean; startDate: string; endDate: string; accessories: Record<string, number> }

type Props = {
  machines: OrderMachine[]
  zones: Zone[]
  today: string
  customerPercent: number
  initialSlug: string
  initialStart: string
  initialEnd: string
  defaults: { name: string; email: string; phone: string; company: string }
}

const newKey = () => Math.random().toString(36).slice(2, 10)
const dayWord = (days: number) => (days === 1 ? "dag" : "dage")
function formatDate(value: string) {
  const [y, m, d] = value.split("-")
  return `${d}.${m}.${y}`
}

export function OrderForm({ machines, zones, today, customerPercent, initialSlug, initialStart, initialEnd, defaults }: Props) {
  const router = useRouter()
  const bySlug = useMemo(() => new Map(machines.map((item) => [item.slug, item])), [machines])
  const categories = useMemo(() => Array.from(new Set(machines.map((item) => item.category))).sort((a, b) => a.localeCompare(b, "da")), [machines])

  const [startDate, setStartDate] = useState(initialStart)
  const [endDate, setEndDate] = useState(initialEnd)
  const [lines, setLines] = useState<Line[]>(() => bySlug.has(initialSlug) ? [{ key: newKey(), slug: initialSlug, ownPeriod: false, startDate: "", endDate: "", accessories: {} }] : [])
  const [delivery, setDelivery] = useState(false)
  const [address, setAddress] = useState("")
  const [postalCode, setPostalCode] = useState("")
  const [codeInput, setCodeInput] = useState("")
  const [code, setCode] = useState<DiscountCodeRule | null>(null)
  const [codeMessage, setCodeMessage] = useState("")
  const [codePending, setCodePending] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState<{ orderNumber: number | null; total: number } | null>(null)

  const periodOf = (line: Line) => line.ownPeriod ? { startDate: line.startDate, endDate: line.endDate } : { startDate, endDate }
  const validPeriod = (period: { startDate: string; endDate: string }) => isValidDateString(period.startDate) && isValidDateString(period.endDate) && period.endDate >= period.startDate && period.startDate >= today
  const sharedValid = validPeriod({ startDate, endDate })

  // Tjek pr. linje. Serveren og databasen tjekker altid selv; dette er kun for at give besked i tide.
  const checked = lines.map((line, index) => {
    const machine = bySlug.get(line.slug)!
    const period = periodOf(line)
    const valid = validPeriod(period)
    const days = valid ? rentalDays(period.startDate, period.endDate) : 0
    const booked = valid && machine.bookedRanges.some((range) => rangesOverlap(period.startDate, period.endDate, range.startDate, range.endDate))
    const duplicate = valid && lines.some((other, otherIndex) => {
      if (otherIndex === index || other.slug !== line.slug) return false
      const otherPeriod = periodOf(other)
      return validPeriod(otherPeriod) && rangesOverlap(period.startDate, period.endDate, otherPeriod.startDate, otherPeriod.endDate)
    })
    const chosen = machine.accessories.filter((item) => (line.accessories[item.id] ?? 0) > 0).map((item) => ({ ...item, quantity: line.accessories[item.id] }))
    return { line, machine, period, valid, days, booked, duplicate, chosen, notDeliverable: delivery && !machine.deliveryAvailable }
  })

  const postalReady = /^\d{4}$/.test(postalCode)
  const zone = delivery && postalReady ? findDeliveryZone(zones, postalCode) : null
  const noZone = delivery && postalReady && !zone

  const quote = calculateOrder({
    lines: checked.map((entry) => ({ days: entry.days, dailyPrice: entry.machine.dailyPrice, machineDeposit: entry.machine.deposit, accessories: entry.chosen.map((item) => ({ dailyPrice: item.dailyPrice, deposit: item.deposit, quantity: item.quantity })) })),
    delivery,
    zone,
    customerPercent,
    code,
    today,
  })

  const blockers = [
    !lines.length && "Tilføj mindst én maskine",
    checked.some((entry) => !entry.valid) && "Vælg en gyldig periode for alle maskiner",
    checked.some((entry) => entry.booked) && "En maskine er optaget i den valgte periode",
    checked.some((entry) => entry.duplicate) && "Den samme maskine er valgt to gange i overlappende perioder",
    checked.some((entry) => entry.notDeliverable) && "En maskine kan ikke leveres",
    noZone && "Vi leverer ikke til postnummeret",
  ].filter(Boolean) as string[]

  function updateLine(key: string, change: Partial<Line>) {
    setLines((current) => current.map((line) => line.key === key ? { ...line, ...change } : line))
  }

  function addMachine(slug: string) {
    if (!slug || lines.length >= MAX_ORDER_LINES) return
    setLines((current) => [...current, { key: newKey(), slug, ownPeriod: false, startDate: "", endDate: "", accessories: {} }])
  }

  async function applyCode() {
    if (!codeInput.trim()) return
    setCodePending(true); setCodeMessage("")
    try {
      const result = await checkDiscountCode(codeInput)
      if (result.ok) { setCode(result.rule); setCodeInput("") }
      else if (result.unauthorized) router.push("/sign-in?next=/booking")
      else { setCode(null); setCodeMessage(result.error) }
    } catch {
      setCodeMessage("Kunne ikke tjekke koden. Prøv igen.")
    } finally {
      setCodePending(false)
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (blockers.length) { setError(blockers[0]); return }
    const form = new FormData(event.currentTarget)
    setPending(true); setError("")
    try {
      const result = await createOrder({
        lines: checked.map((entry) => ({ machineSlug: entry.line.slug, startDate: entry.period.startDate, endDate: entry.period.endDate, accessories: entry.chosen.map((item) => ({ id: item.id, quantity: item.quantity })) })),
        customerName: String(form.get("customerName") ?? ""),
        customerEmail: String(form.get("customerEmail") ?? ""),
        customerPhone: String(form.get("customerPhone") ?? ""),
        company: String(form.get("company") ?? ""),
        notes: String(form.get("notes") ?? ""),
        deliveryType: delivery ? "delivery" : "collection",
        deliveryAddress: address,
        deliveryPostalCode: postalCode,
        discountCode: code?.code ?? "",
        acceptTerms: accepted,
      })
      if (result.ok) { setDone({ orderNumber: result.orderNumber, total: result.total }); window.scrollTo({ top: 0, behavior: "smooth" }); router.refresh() }
      else if (result.unauthorized) router.push("/sign-in?next=/booking")
      else setError(result.error)
    } catch {
      setError("Der opstod en fejl. Prøv igen om lidt.")
    } finally {
      setPending(false)
    }
  }

  if (done) {
    return (
      <section className="order-done">
        <p className="eyebrow">Booking sendt</p>
        <h1>Tak! Din booking {formatOrderNumber(done.orderNumber)} er modtaget.</h1>
        <p className="lead">Samlet pris {formatKr(done.total)} ekskl. moms. Vi gennemgår bookingen og sender en bekræftelse på e-mail. Du kan følge status under Min konto.</p>
        <div className="order-done-actions"><Link href="/min-konto" className="button button-dark">Gå til Min konto</Link><Link href="/maskiner" className="text-link">Se flere maskiner</Link></div>
      </section>
    )
  }

  return (
    <form className="order-layout" onSubmit={submit}>
      <div className="order-main">
        <section className="order-step">
          <header><span className="step-number">1</span><div><h2>Periode</h2><p className="muted">Gælder alle maskiner. Du kan give en maskine sin egen periode længere nede.</p></div></header>
          <div className="form-row">
            <label>Fra<input type="date" required min={today} value={startDate} onChange={(e) => { setStartDate(e.target.value); if (endDate && e.target.value > endDate) setEndDate(e.target.value) }} /></label>
            <label>Til<input type="date" required min={startDate || today} value={endDate} onChange={(e) => setEndDate(e.target.value)} /></label>
          </div>
          {sharedValid && <p className="muted">{rentalDays(startDate, endDate)} {dayWord(rentalDays(startDate, endDate))}, begge dage medregnet.</p>}
        </section>

        <section className="order-step">
          <header><span className="step-number">2</span><div><h2>Maskiner</h2><p className="muted">Tilføj de maskiner, du skal bruge, og vælg tilbehør til hver.</p></div></header>
          {checked.length === 0 && <p className="order-empty">Ingen maskiner valgt endnu.</p>}
          {checked.map(({ line, machine, period, valid, days, booked, duplicate, chosen, notDeliverable }, index) => (
            <article className={`order-line${booked || duplicate || notDeliverable ? " has-error" : ""}`} key={line.key}>
              <div className="order-line-head">
                <img src={machine.image} alt="" className="order-line-thumb" />
                <div className="order-line-title"><span className="eyebrow">{index + 1} · {machine.category}</span><strong>{machine.name}</strong><small>{formatKr(machine.dailyPrice)} pr. dag{machine.deposit > 0 ? ` · depositum ${formatKr(machine.deposit)}` : ""}</small></div>
                <div className="order-line-price">{valid ? <><strong>{formatKr(quote.lines[index].subtotal)}</strong><small>{days} {dayWord(days)}</small></> : <small className="muted">Vælg periode</small>}</div>
              </div>

              <div className="order-line-period">
                <label className="check"><input type="checkbox" checked={line.ownPeriod} onChange={(e) => updateLine(line.key, { ownPeriod: e.target.checked, startDate: line.startDate || startDate, endDate: line.endDate || endDate })} /> Egen periode for denne maskine</label>
                {line.ownPeriod
                  ? <div className="form-row"><label>Fra<input type="date" required min={today} value={line.startDate} onChange={(e) => updateLine(line.key, { startDate: e.target.value, endDate: line.endDate && e.target.value > line.endDate ? e.target.value : line.endDate })} /></label><label>Til<input type="date" required min={line.startDate || today} value={line.endDate} onChange={(e) => updateLine(line.key, { endDate: e.target.value })} /></label></div>
                  : valid && <span className="muted">{formatDate(period.startDate)} – {formatDate(period.endDate)}</span>}
              </div>

              {machine.accessories.length > 0 && (
                <div className="order-accessories">
                  <span className="order-sub">Tilbehør</span>
                  {machine.accessories.map((item) => (
                    <label className="order-accessory" key={item.id}>
                      <span><strong>{item.name}</strong><small>{formatKr(item.dailyPrice)} pr. dag{item.deposit > 0 ? ` · depositum ${formatKr(item.deposit)}` : ""}{item.description ? ` · ${item.description}` : ""}</small></span>
                      <select value={line.accessories[item.id] ?? 0} onChange={(e) => updateLine(line.key, { accessories: { ...line.accessories, [item.id]: Number(e.target.value) } })} aria-label={`Antal ${item.name}`}>
                        {Array.from({ length: 11 }, (_, n) => <option key={n} value={n}>{n === 0 ? "Ingen" : `${n} stk.`}</option>)}
                      </select>
                    </label>
                  ))}
                  {chosen.length > 0 && valid && <small className="muted">Tilbehør i alt: {formatKr(quote.lines[index].accessoriesTotal)}</small>}
                </div>
              )}

              {booked && <p className="form-error" role="alert">Maskinen er optaget i hele eller dele af perioden. Optaget: {machine.bookedRanges.map((range) => range.startDate === range.endDate ? formatDate(range.startDate) : `${formatDate(range.startDate)} – ${formatDate(range.endDate)}`).join(", ")}.</p>}
              {duplicate && <p className="form-error" role="alert">Samme maskine er valgt i en overlappende periode.</p>}
              {notDeliverable && <p className="form-error" role="alert">Denne maskine kan kun afhentes.</p>}
              <div className="order-line-actions"><button type="button" className="text-link" onClick={() => setLines((current) => current.filter((other) => other.key !== line.key))}>Fjern</button></div>
            </article>
          ))}
          {lines.length < MAX_ORDER_LINES
            ? (
              <label className="order-add">
                <span>Tilføj maskine</span>
                <select value="" onChange={(e) => addMachine(e.target.value)}>
                  <option value="">Vælg maskine…</option>
                  {categories.map((category) => (
                    <optgroup label={category} key={category}>
                      {machines.filter((item) => item.category === category).map((item) => <option value={item.slug} key={item.slug}>{item.name} · {formatKr(item.dailyPrice)}/dag</option>)}
                    </optgroup>
                  ))}
                </select>
              </label>
            )
            : <p className="muted">Højst {MAX_ORDER_LINES} maskiner pr. booking. Kontakt os ved større opgaver.</p>}
        </section>

        <section className="order-step">
          <header><span className="step-number">3</span><div><h2>Levering</h2><p className="muted">Levering og afhentning betales én gang for hele bookingen.</p></div></header>
          <div className="choice-row">
            <label className={`choice${!delivery ? " selected" : ""}`}><input type="radio" name="deliveryChoice" checked={!delivery} onChange={() => setDelivery(false)} /><span><strong>Afhentning</strong><small>Hent og aflever selv hos os</small></span></label>
            <label className={`choice${delivery ? " selected" : ""}`}><input type="radio" name="deliveryChoice" checked={delivery} onChange={() => setDelivery(true)} /><span><strong>Levering</strong><small>Vi leverer og henter på adressen</small></span></label>
          </div>
          {delivery && (
            <>
              <div className="form-row">
                <label>Leveringsadresse<input required minLength={3} maxLength={200} autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} /></label>
                <label>Postnummer<input required inputMode="numeric" pattern="\d{4}" maxLength={4} autoComplete="postal-code" value={postalCode} onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ""))} /></label>
              </div>
              {zone && <p className="muted">Leveringszone: <strong>{zone.name}</strong> · {formatKr(quote.deliveryFee)} for levering og afhentning</p>}
              {noZone && <p className="form-error" role="alert">Vi leverer desværre ikke til det postnummer. Kontakt os, eller vælg afhentning.</p>}
            </>
          )}
        </section>

        <section className="order-step">
          <header><span className="step-number">4</span><div><h2>Kontaktoplysninger</h2></div></header>
          <div className="form-row">
            <label>Navn<input name="customerName" required minLength={2} maxLength={100} autoComplete="name" defaultValue={defaults.name} /></label>
            <label>Firma <span className="muted">(valgfrit)</span><input name="company" maxLength={120} autoComplete="organization" defaultValue={defaults.company} /></label>
          </div>
          <div className="form-row">
            <label>Email<input name="customerEmail" type="email" required maxLength={254} autoComplete="email" defaultValue={defaults.email} /></label>
            <label>Telefon<input name="customerPhone" type="tel" required autoComplete="tel" defaultValue={defaults.phone} /></label>
          </div>
          <label>Besked <span className="muted">(valgfrit)</span><textarea name="notes" rows={3} maxLength={1000} placeholder="Fx adgangsforhold, tidspunkt for levering eller opgavens art" /></label>
        </section>
      </div>

      <aside className="order-summary" aria-live="polite">
        <h2>Oversigt</h2>
        {checked.length === 0 ? <p className="muted">Tilføj maskiner for at se prisen.</p> : (
          <div className="summary-lines">
            {checked.map((entry, index) => (
              <div className="summary-row" key={entry.line.key}><span>{entry.machine.name}{entry.valid ? <small>{entry.days} {dayWord(entry.days)}{entry.chosen.length ? ` · ${entry.chosen.length} tilbehør` : ""}</small> : <small>Mangler periode</small>}</span><span>{formatKr(quote.lines[index].subtotal)}</span></div>
            ))}
          </div>
        )}
        <div className="summary-totals">
          <div className="summary-row"><span>Leje</span><span>{formatKr(quote.subtotal)}</span></div>
          {delivery && <div className="summary-row"><span>Levering og afhentning</span><span>{zone ? formatKr(quote.deliveryFee) : "–"}</span></div>}
          {quote.discount > 0 && <div className="summary-row discount"><span>Rabat<small>{quote.discountLabel}</small></span><span>−{formatKr(quote.discount)}</span></div>}
          <div className="summary-row summary-total"><span>I alt ekskl. moms</span><span>{formatKr(quote.total)}</span></div>
          {quote.deposit > 0 && <div className="summary-row summary-deposit"><span>Depositum<small>Opkræves separat og refunderes</small></span><span>{formatKr(quote.deposit)}</span></div>}
        </div>

        <div className="summary-code">
          {code ? (
            <p className="muted">Rabatkode <strong>{code.code}</strong> · <button type="button" className="text-link" onClick={() => { setCode(null); setCodeMessage("") }}>Fjern</button></p>
          ) : (
            <div className="code-row">
              <input value={codeInput} onChange={(e) => setCodeInput(e.target.value)} placeholder="Rabatkode" aria-label="Rabatkode" maxLength={40} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void applyCode() } }} />
              <button type="button" className="button" onClick={applyCode} disabled={codePending || !codeInput.trim()}>{codePending ? "…" : "Anvend"}</button>
            </div>
          )}
          {codeMessage && <p className="form-error" role="alert">{codeMessage}</p>}
          {code && quote.codeError && <p className="muted">{quote.codeError}</p>}
          {customerPercent > 0 && <p className="muted">Din faste kunderabat: {customerPercent} %</p>}
        </div>

        <label className="check"><input type="checkbox" required checked={accepted} onChange={(e) => setAccepted(e.target.checked)} /> <span>Jeg accepterer <Link href="/handelsbetingelser" target="_blank" className="text-link">handelsbetingelserne</Link> og <Link href="/privatlivspolitik" target="_blank" className="text-link">privatlivspolitikken</Link>.</span></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        {!error && blockers.length > 0 && lines.length > 0 && <p className="muted">{blockers[0]}.</p>}
        <button className="button button-dark order-submit" disabled={pending || blockers.length > 0}>{pending ? "Sender booking…" : "Send booking"}</button>
        <p className="muted small-print">Bookingen er bindende, når vi har bekræftet den på e-mail.</p>
      </aside>
    </form>
  )
}
