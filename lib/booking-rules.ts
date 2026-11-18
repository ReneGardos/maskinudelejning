// Fælles regler for bookinger. Bruges både på serveren (som sandhed) og i formularen (til visning).

export const MAX_RENTAL_DAYS = 90
export const BOOKING_STATUSES = ["pending", "confirmed", "cancelled"] as const
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function isValidDateString(value: string) {
  if (!DATE_RE.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** Dags dato i Danmark som YYYY-MM-DD. */
export function todayInDenmark() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Copenhagen" }).format(new Date())
}

/** Antal lejedage, begge dage medregnet (10.–10. = 1 dag, 10.–12. = 3 dage). */
export function rentalDays(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00Z`).getTime()
  const end = new Date(`${endDate}T00:00:00Z`).getTime()
  return Math.round((end - start) / 86400000) + 1
}

export const DELIVERY_METHODS = ["pickup", "delivery"] as const
export type DeliveryMethod = (typeof DELIVERY_METHODS)[number]

/** Kunden kan selv annullere, indtil dagen før lejeperioden starter. */
export function canCancelBooking(startDate: string, status: string) {
  return (status === "pending" || status === "confirmed") && startDate > todayInDenmark()
}

/** Overlapper to perioder? Begge ender er inklusive. */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && aEnd >= bStart
}

export type BookingInput = {
  machineSlug: string
  startDate: string
  endDate: string
  customerName: string
  customerEmail: string
  customerPhone: string
  notes: string | null
  deliveryMethod: DeliveryMethod
  deliveryAddress: string | null
  deliveryPostcode: string | null
}

/** Rensér og valider input fra klienten. Kaster en dansk fejlbesked ved ugyldigt input. */
export function parseBookingInput(raw: unknown): BookingInput {
  if (!raw || typeof raw !== "object") throw new Error("Ugyldig forespørgsel")
  const input = raw as Record<string, unknown>
  const text = (key: string) => (typeof input[key] === "string" ? (input[key] as string).trim() : "")

  const machineSlug = text("machineSlug")
  const startDate = text("startDate")
  const endDate = text("endDate")
  const customerName = text("customerName")
  const customerEmail = text("customerEmail").toLowerCase()
  const customerPhone = text("customerPhone")
  const notes = text("notes")
  const deliveryMethod = text("deliveryMethod") || "pickup"
  const deliveryAddress = text("deliveryAddress")
  const deliveryPostcode = text("deliveryPostcode")

  if (!(DELIVERY_METHODS as readonly string[]).includes(deliveryMethod)) throw new Error("Vælg levering eller afhentning")
  if (deliveryMethod === "delivery") {
    if (deliveryAddress.length < 3 || deliveryAddress.length > 200) throw new Error("Indtast leveringsadressen")
    if (!/^\d{4}$/.test(deliveryPostcode)) throw new Error("Indtast et gyldigt postnummer (4 cifre)")
  }
  if (!machineSlug || machineSlug.length > 100) throw new Error("Ugyldig maskine")
  if (!isValidDateString(startDate) || !isValidDateString(endDate)) throw new Error("Ugyldige datoer")
  if (endDate < startDate) throw new Error("Slutdatoen kan ikke være før startdatoen")
  if (startDate < todayInDenmark()) throw new Error("Startdatoen kan ikke ligge i fortiden")
  if (rentalDays(startDate, endDate) > MAX_RENTAL_DAYS) throw new Error(`Maskiner kan højst lejes i ${MAX_RENTAL_DAYS} dage ad gangen. Kontakt os ved længere perioder.`)
  if (customerName.length < 2 || customerName.length > 100) throw new Error("Indtast dit navn")
  if (customerEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) throw new Error("Indtast en gyldig e-mailadresse")
  const phoneDigits = customerPhone.replace(/\D/g, "")
  if (phoneDigits.length < 8 || phoneDigits.length > 15 || !/^[+\d\s().-]+$/.test(customerPhone)) throw new Error("Indtast et gyldigt telefonnummer")
  if (notes.length > 1000) throw new Error("Beskeden må højst fylde 1000 tegn")

  const delivery = deliveryMethod === "delivery"
  return {
    machineSlug, startDate, endDate, customerName, customerEmail, customerPhone, notes: notes || null,
    deliveryMethod: deliveryMethod as DeliveryMethod,
    deliveryAddress: delivery ? deliveryAddress : null,
    deliveryPostcode: delivery ? deliveryPostcode : null,
  }
}
