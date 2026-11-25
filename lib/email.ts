// Mails sendes via Resend's HTTP-API (ingen ekstra pakker nødvendige).
// Sæt RESEND_API_KEY og MAIL_FROM for at slå mails til. Uden dem logges mailen blot (uden indhold), og siden virker som normalt.

export type BookingMail = {
  machineName: string
  startDate: string
  endDate: string
  total: number
  deliveryFee: number
  deposit: number
  customerName: string
  customerEmail: string
  customerPhone: string
  notes: string | null
  deliveryType: string
  deliveryAddress: string | null
  deliveryPostalCode: string | null
  items?: Array<{ name: string; quantity: number }>
}

export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

export function siteUrl() {
  return (process.env.BETTER_AUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")).replace(/\/$/, "")
}

function adminRecipient() {
  return process.env.ADMIN_NOTIFY_EMAIL || (process.env.ADMIN_EMAILS || "").split(",")[0]?.trim() || ""
}

function formatDate(value: string) {
  const [y, m, d] = value.split("-")
  return `${d}.${m}.${y}`
}

const kr = (amount: number) => `${amount.toLocaleString("da-DK")} kr.`

function deliveryLine(b: BookingMail) {
  if (b.deliveryType !== "delivery") return "Afhentning hos os"
  const fee = b.deliveryFee > 0 ? ` (${kr(b.deliveryFee)})` : ""
  return `Levering til ${b.deliveryAddress}, ${b.deliveryPostalCode}${fee}`
}

function layout(title: string, lead: string, b: BookingMail, extra = "") {
  const row = (label: string, value: string) => `<tr><td style="padding:6px 16px 6px 0;color:#666;vertical-align:top">${label}</td><td style="padding:6px 0"><strong>${escapeHtml(value)}</strong></td></tr>`
  const accessories = b.items?.length ? row("Tilbehør", b.items.map((item) => `${item.quantity} × ${item.name}`).join(", ")) : ""
  const deposit = b.deposit > 0 ? row("Depositum", `${kr(b.deposit)} (refunderes ved afleveret i orden)`) : ""
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#171a1b">
<h2 style="margin:0 0 12px">${escapeHtml(title)}</h2><p>${lead}</p>
<table style="border-collapse:collapse;margin:16px 0">${row("Maskine", b.machineName)}${row("Periode", `${formatDate(b.startDate)} – ${formatDate(b.endDate)}`)}${accessories}${row("Levering", deliveryLine(b))}${row("Pris i alt", `${kr(b.total)} ekskl. moms`)}${deposit}</table>${extra}
<p style="color:#666;font-size:13px">Se og administrer dine bookinger under <a href="${siteUrl()}/min-konto">Min konto</a>.</p></div>`
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!to) return
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.MAIL_FROM
  if (!apiKey || !from) {
    console.log(`[mail ikke sendt – RESEND_API_KEY/MAIL_FROM mangler] emne="${subject}"`)
    return
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) console.error(`[mail fejlede] ${res.status} ${await res.text()}`)
  } catch (error) {
    console.error("[mail fejlede]", error)
  }
}

/** Kunden har sendt en forespørgsel: kvittering til kunden og besked til udlejer. */
export async function sendBookingReceived(b: BookingMail) {
  await sendEmail(b.customerEmail, "Vi har modtaget din bookingforespørgsel", layout("Tak for din forespørgsel", `Hej ${escapeHtml(b.customerName)}, vi har modtaget din forespørgsel og vender tilbage med en endelig bekræftelse.`, b))
  const notes = b.notes ? `<p><strong>Besked:</strong> ${escapeHtml(b.notes)}</p>` : ""
  await sendEmail(adminRecipient(), `Ny booking: ${b.machineName}`, layout("Ny bookingforespørgsel", `${escapeHtml(b.customerName)} (${escapeHtml(b.customerEmail)}, ${escapeHtml(b.customerPhone)}) har sendt en forespørgsel. <a href="${siteUrl()}/admin">Åbn administration</a>.`, b, notes))
}

/** Admin har bekræftet eller annulleret: besked til kunden. */
export async function sendStatusChanged(b: BookingMail, status: "confirmed" | "cancelled") {
  if (status === "confirmed") await sendEmail(b.customerEmail, "Din booking er bekræftet", layout("Din booking er bekræftet", `Hej ${escapeHtml(b.customerName)}, din booking er bekræftet.`, b))
  else await sendEmail(b.customerEmail, "Din booking er annulleret", layout("Din booking er annulleret", `Hej ${escapeHtml(b.customerName)}, din booking er desværre blevet annulleret. Kontakt os, hvis du har spørgsmål.`, b))
}

/** Kunden har selv annulleret: kvittering til kunden og besked til udlejer. */
export async function sendCancelledByCustomer(b: BookingMail) {
  await sendEmail(b.customerEmail, "Din booking er annulleret", layout("Din booking er annulleret", `Hej ${escapeHtml(b.customerName)}, vi har annulleret din booking som ønsket.`, b))
  await sendEmail(adminRecipient(), `Booking annulleret af kunde: ${b.machineName}`, layout("Kunden har annulleret", `${escapeHtml(b.customerName)} har selv annulleret sin booking.`, b))
}

/** Link til at vælge en ny adgangskode. Linket udløber efter en time. */
export async function sendPasswordReset(to: string, name: string, url: string) {
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#171a1b">
<h2 style="margin:0 0 12px">Nulstil din adgangskode</h2>
<p>Hej ${escapeHtml(name)}, vi har modtaget en anmodning om at nulstille adgangskoden til din konto.</p>
<p><a href="${escapeHtml(url)}" style="display:inline-block;background:#171a1b;color:#fff;padding:12px 20px;border-radius:99px;text-decoration:none;font-weight:bold">Vælg ny adgangskode</a></p>
<p style="color:#666;font-size:13px">Linket virker i én time. Har du ikke bedt om det, kan du blot ignorere denne mail. Din adgangskode ændres ikke.</p></div>`
  await sendEmail(to, "Nulstil din adgangskode", html)
}
