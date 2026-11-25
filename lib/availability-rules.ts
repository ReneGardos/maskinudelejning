// Ledighed beregnet ud fra optagede perioder (begge datoer inklusive). Ren logik, bruges i browseren og testes separat.

export type Range = { startDate: string; endDate: string }

const DAY = 86400000
export const addDays = (date: string, days: number) => new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10)
export const daysBetween = (start: string, end: string) => Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY) + 1

export function isFree(ranges: Range[], start: string, end: string) {
  return !ranges.some((range) => range.startDate <= end && range.endDate >= start)
}

/** Første startdato (fra og med `from`), hvor maskinen er ledig i `days` sammenhængende dage. Null, hvis intet inden for `horizon` dage. */
export function nextFreeStart(ranges: Range[], from: string, days: number, horizon = 365): string | null {
  let candidate = from
  const limit = addDays(from, horizon)
  const sorted = [...ranges].sort((a, b) => a.startDate.localeCompare(b.startDate))
  while (candidate <= limit) {
    const end = addDays(candidate, Math.max(1, days) - 1)
    const clash = sorted.find((range) => range.startDate <= end && range.endDate >= candidate)
    if (!clash) return candidate
    candidate = addDays(clash.endDate, 1)
  }
  return null
}

/** Er en bestemt dag optaget? */
export function isBookedDay(ranges: Range[], day: string) {
  return ranges.some((range) => range.startDate <= day && range.endDate >= day)
}

/** Hurtige periodevalg ud fra i dag: i morgen, kommende weekend og en uge. */
export function periodPresets(today: string) {
  const tomorrow = addDays(today, 1)
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay() // 0 = søndag
  const toSaturday = (6 - weekday + 7) % 7 || 7
  const saturday = addDays(today, toSaturday)
  return [
    { label: "I morgen", start: tomorrow, end: tomorrow },
    { label: "Weekend", start: saturday, end: addDays(saturday, 1) },
    { label: "1 uge", start: tomorrow, end: addDays(tomorrow, 6) },
  ]
}

export const formatShortDate = (value: string) => {
  const [, m, d] = value.split("-")
  return `${Number(d)}.${Number(m)}.`
}

/** Link til bookingsiden med maskine, periode og levering udfyldt. */
export function bookingHref(input: { slug?: string; start?: string; end?: string; postalCode?: string }) {
  const params = new URLSearchParams()
  if (input.slug) params.set("maskine", input.slug)
  if (input.start && input.end) { params.set("start", input.start); params.set("end", input.end) }
  if (input.postalCode) { params.set("levering", "1"); params.set("postnr", input.postalCode) }
  const query = params.toString()
  return query ? `/booking?${query}` : "/booking"
}
