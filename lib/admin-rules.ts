// Validering af det, administratoren gemmer (maskiner, tilbehør, leveringszoner).
// Kaster en dansk fejlbesked ved ugyldigt input. Ren logik uden database, så den kan testes.

type Raw = Record<string, unknown>

function asRecord(value: unknown): Raw {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Ugyldig forespørgsel")
  return value as Raw
}

function text(input: Raw, key: string) {
  return typeof input[key] === "string" ? (input[key] as string).trim() : ""
}

function whole(input: Raw, key: string, label: string, min: number, max: number) {
  const value = input[key]
  const number = typeof value === "string" && value.trim() !== "" ? Number(value) : value
  if (typeof number !== "number" || !Number.isInteger(number) || number < min || number > max) {
    throw new Error(`${label} skal være et helt tal mellem ${min.toLocaleString("da-DK")} og ${max.toLocaleString("da-DK")}`)
  }
  return number
}

function length(value: string, label: string, min: number, max: number) {
  if (value.length < min || value.length > max) throw new Error(min > 0 ? `${label} skal være ${min}–${max} tegn` : `${label} må højst være ${max} tegn`)
}

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

/** "nøgle: værdi" pr. linje → objekt. Tomme linjer springes over. */
export function parseSpecifications(value: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length > 20) throw new Error("Højst 20 specifikationer")
  for (const line of lines) {
    const index = line.indexOf(":")
    if (index < 1) throw new Error(`Specifikationen "${line.slice(0, 30)}" mangler et kolon. Skriv fx "Motor: Diesel"`)
    const key = line.slice(0, index).trim()
    const val = line.slice(index + 1).trim()
    if (!key || !val) throw new Error(`Specifikationen "${line.slice(0, 30)}" skal have både navn og værdi`)
    if (key.length > 40 || val.length > 100) throw new Error("Specifikationer må højst være 40 tegn i navnet og 100 i værdien")
    if (key in result) throw new Error(`Specifikationen "${key}" er skrevet to gange`)
    result[key] = val
  }
  return result
}

/** Billede: en sti på siden (/fil.png) eller en https-adresse. */
export function parseImage(value: string) {
  if (value.length < 2 || value.length > 500) throw new Error("Angiv et billede (sti eller https-adresse)")
  if (value.startsWith("/")) {
    if (value.startsWith("//") || value.includes("..") || /[\s"'<>\\]/.test(value)) throw new Error("Ugyldig billedsti")
    return value
  }
  try {
    const url = new URL(value)
    if (url.protocol !== "https:") throw new Error()
  } catch {
    throw new Error("Billedet skal være en sti på siden (fx /maskine.png) eller en https-adresse")
  }
  if (/[\s"'<>\\]/.test(value)) throw new Error("Ugyldig billedadresse")
  return value
}

export type MachineInput = {
  id: string | null
  slug: string
  name: string
  category: string
  description: string
  dailyPrice: number
  deposit: number
  image: string
  manufacturer: string
  model: string
  specifications: Record<string, string>
  active: boolean
  deliveryAvailable: boolean
}

export function parseMachineInput(raw: unknown): MachineInput {
  const input = asRecord(raw)
  const slug = text(input, "slug").toLowerCase()
  const name = text(input, "name")
  const category = text(input, "category")
  const description = text(input, "description")
  const manufacturer = text(input, "manufacturer") || "Maskinudlejning"
  const model = text(input, "model")
  length(name, "Navn", 2, 100)
  length(category, "Kategori", 2, 60)
  length(description, "Beskrivelse", 5, 1000)
  length(manufacturer, "Producent", 1, 100)
  length(model, "Model", 0, 100)
  if (slug.length < 2 || slug.length > 60 || !SLUG_RE.test(slug)) throw new Error("Adressen (slug) må kun indeholde små bogstaver, tal og bindestreger, fx 1-5t-minigraver")
  return {
    id: text(input, "id") || null,
    slug,
    name,
    category,
    description,
    dailyPrice: whole(input, "dailyPrice", "Dagspris", 1, 100000),
    deposit: whole(input, "deposit", "Depositum", 0, 1000000),
    image: parseImage(text(input, "image")),
    manufacturer,
    model,
    specifications: parseSpecifications(typeof input.specifications === "string" ? input.specifications : ""),
    active: input.active === true,
    deliveryAvailable: input.deliveryAvailable === true,
  }
}

export type AccessoryInput = {
  id: string | null
  machineId: string
  name: string
  description: string
  dailyPrice: number
  deposit: number
  active: boolean
}

export function parseAccessoryInput(raw: unknown): AccessoryInput {
  const input = asRecord(raw)
  const machineId = text(input, "machineId")
  const name = text(input, "name")
  const description = text(input, "description")
  if (!machineId || machineId.length > 100) throw new Error("Ugyldig maskine")
  length(name, "Navn", 2, 100)
  length(description, "Beskrivelse", 0, 300)
  return {
    id: text(input, "id") || null,
    machineId,
    name,
    description,
    dailyPrice: whole(input, "dailyPrice", "Dagspris", 0, 100000),
    deposit: whole(input, "deposit", "Depositum", 0, 1000000),
    active: input.active === true,
  }
}

/** Postnumre: kommasepareret liste af 4-cifrede numre, eller * for alle øvrige områder. */
export function parsePostalCodes(value: string) {
  const parts = Array.from(new Set(value.split(/[\s,;]+/).map((part) => part.trim()).filter(Boolean)))
  if (!parts.length) throw new Error("Angiv mindst ét postnummer, eller * for øvrige områder")
  if (parts.length > 1000) throw new Error("For mange postnumre")
  for (const part of parts) if (part !== "*" && !/^\d{4}$/.test(part)) throw new Error(`"${part.slice(0, 20)}" er ikke et gyldigt postnummer (4 cifre) eller *`)
  return parts.join(",")
}

export type ZoneInput = {
  id: string | null
  name: string
  postalCodes: string
  deliveryFee: number
  collectionFee: number
  active: boolean
}

export function parseZoneInput(raw: unknown): ZoneInput {
  const input = asRecord(raw)
  const name = text(input, "name")
  length(name, "Navn", 2, 60)
  return {
    id: text(input, "id") || null,
    name,
    postalCodes: parsePostalCodes(text(input, "postalCodes")),
    deliveryFee: whole(input, "deliveryFee", "Leveringsgebyr", 0, 100000),
    collectionFee: whole(input, "collectionFee", "Afhentningsgebyr", 0, 100000),
    active: input.active === true,
  }
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

function optionalDate(input: Raw, key: string, label: string) {
  const value = text(input, key)
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00Z`)
  if (!DATE_ONLY.test(value) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) throw new Error(`${label} er ikke en gyldig dato`)
  return value
}

export type DiscountCodeInput = {
  id: string | null
  code: string
  kind: "percent" | "amount"
  value: number
  minSubtotal: number
  validFrom: string | null
  validUntil: string | null
  maxUses: number | null
  active: boolean
  note: string | null
}

export function parseDiscountCodeInput(raw: unknown): DiscountCodeInput {
  const input = asRecord(raw)
  const code = text(input, "code").toUpperCase().replace(/\s+/g, "")
  if (!/^[A-Z0-9ÆØÅ_-]{3,30}$/.test(code)) throw new Error("Koden skal være 3–30 tegn og må kun indeholde bogstaver, tal, - og _")
  const kind = text(input, "kind")
  if (kind !== "percent" && kind !== "amount") throw new Error("Vælg procent eller kronebeløb")
  const value = kind === "percent" ? whole(input, "value", "Rabat i procent", 1, 100) : whole(input, "value", "Rabat i kr.", 1, 1000000)
  const validFrom = optionalDate(input, "validFrom", "Startdato")
  const validUntil = optionalDate(input, "validUntil", "Slutdato")
  if (validFrom && validUntil && validUntil < validFrom) throw new Error("Slutdatoen kan ikke være før startdatoen")
  const maxUsesRaw = input.maxUses
  const maxUses = maxUsesRaw === null || maxUsesRaw === undefined || maxUsesRaw === "" ? null : whole(input, "maxUses", "Maks antal brug", 1, 100000)
  const note = text(input, "note")
  length(note, "Note", 0, 200)
  return {
    id: text(input, "id") || null,
    code, kind, value,
    minSubtotal: input.minSubtotal === "" || input.minSubtotal === undefined ? 0 : whole(input, "minSubtotal", "Minimumsbeløb", 0, 10000000),
    validFrom, validUntil, maxUses,
    active: input.active === true,
    note: note || null,
  }
}

export type CustomerDiscountInput = { userId: string; percent: number; note: string | null }

export function parseCustomerDiscountInput(raw: unknown): CustomerDiscountInput {
  const input = asRecord(raw)
  const userId = text(input, "userId")
  if (!userId || userId.length > 100) throw new Error("Ugyldig kunde")
  const note = text(input, "note")
  length(note, "Note", 0, 200)
  return { userId, percent: whole(input, "percent", "Rabat", 0, 100), note: note || null }
}
