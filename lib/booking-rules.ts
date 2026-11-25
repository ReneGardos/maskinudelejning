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

export const DELIVERY_TYPES = ["collection", "delivery"] as const
export type DeliveryType = (typeof DELIVERY_TYPES)[number]

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
  deliveryType: DeliveryType
  deliveryAddress: string | null
  deliveryPostalCode: string | null
  accessories: Array<{ id: string; quantity: number }>
}

export const MAX_ACCESSORY_QUANTITY = 10

/** Rensér tilbehørslisten: kun gyldige id'er og antal, og samme tilbehør lægges sammen. */
function parseAccessories(value: unknown): Array<{ id: string; quantity: number }> {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value) || value.length > 20) throw new Error("Ugyldigt tilbehør")
  const merged = new Map<string, number>()
  for (const entry of value) {
    const item = entry as { id?: unknown; quantity?: unknown } | null
    if (!item || typeof item.id !== "string" || !item.id || item.id.length > 100) throw new Error("Ugyldigt tilbehør")
    const quantity = Number(item.quantity)
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_ACCESSORY_QUANTITY) throw new Error("Ugyldigt antal tilbehør")
    merged.set(item.id, (merged.get(item.id) ?? 0) + quantity)
  }
  for (const quantity of merged.values()) if (quantity > MAX_ACCESSORY_QUANTITY) throw new Error("Ugyldigt antal tilbehør")
  return Array.from(merged, ([id, quantity]) => ({ id, quantity }))
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
  const deliveryType = text("deliveryType") || "collection"
  const deliveryAddress = text("deliveryAddress")
  const deliveryPostalCode = text("deliveryPostalCode")

  if (input.acceptTerms !== true) throw new Error("Du skal acceptere handelsbetingelserne for at sende en forespørgsel")
  const accessories = parseAccessories(input.accessories)

  if (!(DELIVERY_TYPES as readonly string[]).includes(deliveryType)) throw new Error("Vælg levering eller afhentning")
  if (deliveryType === "delivery") {
    if (deliveryAddress.length < 3 || deliveryAddress.length > 200) throw new Error("Indtast leveringsadressen")
    if (!/^\d{4}$/.test(deliveryPostalCode)) throw new Error("Indtast et gyldigt postnummer (4 cifre)")
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

  const delivery = deliveryType === "delivery"
  return {
    machineSlug, startDate, endDate, customerName, customerEmail, customerPhone, notes: notes || null,
    deliveryType: deliveryType as DeliveryType,
    deliveryAddress: delivery ? deliveryAddress : null,
    deliveryPostalCode: delivery ? deliveryPostalCode : null,
    accessories,
  }
}
