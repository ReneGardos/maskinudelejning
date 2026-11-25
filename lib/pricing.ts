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
