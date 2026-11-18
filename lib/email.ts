// Mails sendes via Resend's HTTP-API (ingen ekstra pakker nødvendige).
// Sæt RESEND_API_KEY og MAIL_FROM for at slå mails til. Uden dem logges mailen blot, og booking virker som normalt.

type BookingMail = {
  machineName: string
  startDate: string
  endDate: string
  total: number
  customerName: string
  customerEmail: string
  customerPhone: string
  notes: string | null
  deliveryType: string
  deliveryAddress: string | null
  deliveryPostalCode: string | null
}

export function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")
}

function siteUrl() {
  return (process.env.BETTER_AUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")).replace(/\/$/, "")
}

function adminRecipient() {
  return process.env.ADMIN_NOTIFY_EMAIL || (process.env.ADMIN_EMAILS || "").split(",")[0]?.trim() || ""
}

function formatDate(value: string) {
  const [y, m, d] = value.split("-")
  return `${d}.${m}.${y}`
}

function deliveryLine(b: BookingMail) {
  return b.deliveryType === "delivery" ? `Levering til ${b.deliveryAddress}, ${b.deliveryPostalCode} (pris aftales)` : "Afhentning hos os"
}

function layout(title: string, lead: string, b: BookingMail, extra = "") {
  const row = (label: string, value: string) => `<tr><td style="padding:6px 16px 6px 0;color:#666">${label}</td><td style="padding:6px 0"><strong>${escapeHtml(value)}</strong></td></tr>`
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#171a1b">
<h2 style="margin:0 0 12px">${escapeHtml(title)}</h2><p>${lead}</p>
<table style="border-collapse:collapse;margin:16px 0">${row("Maskine", b.machineName)}${row("Periode", `${formatDate(b.startDate)} – ${formatDate(b.endDate)}`)}${row("Pris", `${b.total.toLocaleString("da-DK")} kr. ekskl. moms`)}${row("Levering", deliveryLine(b))}</table>${extra}
<p style="color:#666;font-size:13px">Se og administrer dine bookinger under <a href="${siteUrl()}/min-konto">Min konto</a>.</p></div>`
}

export async function sendEmail(to: string, subject: string, html: string) {
  if (!to) return
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.MAIL_FROM
  if (!apiKey || !from) {
    console.log(`[mail ikke sendt – RESEND_API_KEY/MAIL_FROM mangler] til=${to} emne="${subject}"`)
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
