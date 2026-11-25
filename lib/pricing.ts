// Prisregler. Bruges både på serveren (som sandhed) og i formularen (til live-visning), så tallene altid er ens.
// Alle beløb er hele kroner ekskl. moms.

export type Zone = { id: string; name: string; postalCodes: string; deliveryFee: number; collectionFee: number }

function codesOf(zone: Zone) {
  return zone.postalCodes.split(",").map((code) => code.trim()).filter(Boolean)
}

/** Find leveringszonen for et postnummer. Et præcist match vinder; ellers bruges zonen med "*" (øvrige områder). */
export function findDeliveryZone<T extends Zone>(zones: T[], postalCode: string): T | null {
  const code = postalCode.trim()
  if (/^\d{4}$/.test(code)) {
    const exact = zones.find((zone) => codesOf(zone).includes(code))
    if (exact) return exact
  }
  return zones.find((zone) => codesOf(zone).includes("*")) ?? null
}

export type QuoteAccessory = { dailyPrice: number; deposit: number; quantity: number }

export type Quote = {
  days: number
  rental: number
  accessoriesTotal: number
  deliveryFee: number
  total: number
  /** Refunderbart depositum. Indgår ikke i totalen. */
  deposit: number
}

export function calculateQuote(input: {
  days: number
  dailyPrice: number
  machineDeposit: number
  delivery: boolean
  zone: Zone | null
  accessories: QuoteAccessory[]
}): Quote {
  const days = Math.max(0, Math.floor(input.days))
  const rental = days * input.dailyPrice
  const accessoriesTotal = input.accessories.reduce((sum, item) => sum + days * item.dailyPrice * item.quantity, 0)
  // Ved levering lægges både levering og afhentning (collectionFee) oven i.
  const deliveryFee = input.delivery && input.zone ? input.zone.deliveryFee + input.zone.collectionFee : 0
  const deposit = input.machineDeposit + input.accessories.reduce((sum, item) => sum + item.deposit * item.quantity, 0)
  return { days, rental, accessoriesTotal, deliveryFee, total: rental + accessoriesTotal + deliveryFee, deposit }
}

export const formatKr = (amount: number) => `${amount.toLocaleString("da-DK")} kr.`

// ---- Samlede bookinger (flere maskiner) og rabatter ----

export type DiscountCodeRule = {
  code: string
  kind: "percent" | "amount" | string
  value: number
  minSubtotal: number
  validFrom: string | null
  validUntil: string | null
  maxUses: number | null
  usedCount: number
  active: boolean
}

/** Er rabatkoden gyldig for dette beløb og denne dato? Returnerer rabatten i kr. eller en dansk fejlbesked. */
export function evaluateDiscountCode(rule: DiscountCodeRule, subtotal: number, today: string): { amount: number; label: string } | { error: string } {
  if (!rule.active) return { error: "Rabatkoden er ikke aktiv" }
  if (rule.validFrom && today < rule.validFrom) return { error: "Rabatkoden er ikke gyldig endnu" }
  if (rule.validUntil && today > rule.validUntil) return { error: "Rabatkoden er udløbet" }
  if (rule.maxUses !== null && rule.usedCount >= rule.maxUses) return { error: "Rabatkoden er brugt op" }
  if (subtotal < rule.minSubtotal) return { error: `Rabatkoden kræver en leje på mindst ${formatKr(rule.minSubtotal)}` }
  if (rule.kind === "percent") {
    const percent = Math.min(100, Math.max(0, rule.value))
    return { amount: Math.round((subtotal * percent) / 100), label: `${rule.code} (${percent} %)` }
  }
  return { amount: Math.min(subtotal, Math.max(0, rule.value)), label: `${rule.code} (${formatKr(rule.value)})` }
}

export type OrderLineInput = { days: number; dailyPrice: number; machineDeposit: number; accessories: QuoteAccessory[] }

export type OrderQuote = {
  lines: Array<{ days: number; rental: number; accessoriesTotal: number; subtotal: number; deposit: number }>
  subtotal: number
  deliveryFee: number
  discount: number
  discountLabel: string | null
  discountSource: "code" | "customer" | null
  /** Hvorfor en indtastet kode ikke gav rabat (fx udløbet). */
  codeError: string | null
  total: number
  deposit: number
}

/**
 * Pris for en samlet booking. Levering betales én gang for hele bookingen.
 * Rabat gives kun på leje og tilbehør, ikke på levering eller depositum.
 * Kunderabat og rabatkode lægges ikke sammen: den største vinder.
 */
export function calculateOrder(input: {
  lines: OrderLineInput[]
  delivery: boolean
  zone: Zone | null
  customerPercent: number
  code: DiscountCodeRule | null
  today: string
}): OrderQuote {
  const lines = input.lines.map((line) => {
    const quote = calculateQuote({ days: line.days, dailyPrice: line.dailyPrice, machineDeposit: line.machineDeposit, delivery: false, zone: null, accessories: line.accessories })
    return { days: quote.days, rental: quote.rental, accessoriesTotal: quote.accessoriesTotal, subtotal: quote.rental + quote.accessoriesTotal, deposit: quote.deposit }
  })
  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0)
  const deposit = lines.reduce((sum, line) => sum + line.deposit, 0)
  const deliveryFee = input.delivery && input.zone && lines.length ? input.zone.deliveryFee + input.zone.collectionFee : 0

  const percent = Math.min(100, Math.max(0, Math.floor(input.customerPercent || 0)))
  const customer = percent > 0 ? { amount: Math.round((subtotal * percent) / 100), label: `Kunderabat (${percent} %)` } : null
  let code: { amount: number; label: string } | null = null
  let codeError: string | null = null
  if (input.code) {
    const result = evaluateDiscountCode(input.code, subtotal, input.today)
    if ("error" in result) codeError = result.error
    else code = result
  }

  let discount = 0
  let discountLabel: string | null = null
  let discountSource: OrderQuote["discountSource"] = null
  if (code && code.amount > 0 && code.amount >= (customer?.amount ?? 0)) { discount = code.amount; discountLabel = code.label; discountSource = "code" }
  else if (customer && customer.amount > 0) { discount = customer.amount; discountLabel = customer.label; discountSource = "customer" }
  if (code && discountSource === "customer") codeError = "Din faste kunderabat er større og bruges i stedet"
  discount = Math.min(discount, subtotal)

  return { lines, subtotal, deliveryFee, discount, discountLabel, discountSource, codeError, total: subtotal - discount + deliveryFee, deposit }
}

export const formatOrderNumber = (orderNumber: number | null | undefined) => orderNumber ? `MU-${orderNumber}` : "MU-?"
