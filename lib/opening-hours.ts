export const OPENING_HOURS = {
  weekday: "07:00–16:00",
  saturday: "08:00–12:00",
  sunday: "Lukket",
} as const

export function getOpeningHours(date = new Date()) {
  const day = date.getDay()
  if (day === 0) return OPENING_HOURS.sunday
  if (day === 6) return OPENING_HOURS.saturday
  return OPENING_HOURS.weekday
}
