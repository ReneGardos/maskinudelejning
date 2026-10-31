export const VAT_RATE = 0.25

export type RentalPriceInput = { dailyPrice: number; deposit: number; startDate: string; endDate: string; deliveryFee?: number; collectionFee?: number; accessoryTotal?: number }

export function calculateRentalPrice(input: RentalPriceInput) {
  const start = new Date(`${input.startDate}T00:00:00Z`).getTime()
  const end = new Date(`${input.endDate}T00:00:00Z`).getTime()
  const days = Math.max(1, Math.ceil((end - start) / 86400000) + 1)
  const weeks = Math.floor(days / 7)
  const remainingDays = days % 7
  const baseRentalNet = weeks * input.dailyPrice * 5 + remainingDays * input.dailyPrice
  const longTermDiscount = days >= 30 ? 0.9 : 1
  const rentalNet = Math.round(baseRentalNet * longTermDiscount)
  const deliveryNet = (input.deliveryFee || 0) + (input.collectionFee || 0)
  const accessoryNet = input.accessoryTotal || 0
  const subtotal = rentalNet + deliveryNet + accessoryNet
  return { days, rentalNet, longTermDiscount, deliveryNet, accessoryNet, subtotal, vat: Math.round(subtotal * VAT_RATE), total: Math.round(subtotal * (1 + VAT_RATE)), deposit: input.deposit }
}
