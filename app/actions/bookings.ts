'use server'

import { db } from "@/lib/db"
import { accessory, booking, bookingItem, deliveryZone, machine } from "@/lib/db/schema"
import { requireAdmin, requireUser } from "@/lib/session"
import { BOOKING_STATUSES, type BookingStatus, canCancelBooking, parseBookingInput, rentalDays } from "@/lib/booking-rules"
import { type ActionResult, errorCode } from "@/lib/action-result"
import { calculateQuote, findDeliveryZone } from "@/lib/pricing"
import { type BookingMail, sendBookingReceived, sendCancelledByCustomer, sendStatusChanged } from "@/lib/email"
import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { randomUUID } from "crypto"
import { and, desc, eq, gte, inArray, lte, ne } from "drizzle-orm"

const OVERLAP_MESSAGE = "Maskinen er allerede booket i hele eller dele af den periode. Vælg andre datoer."

type ItemRow = typeof bookingItem.$inferSelect

/** Hent tilbehørslinjer for en liste af bookinger og læg dem på hver booking. */
async function withItems<T extends { id: string }>(rows: T[]): Promise<Array<T & { items: ItemRow[] }>> {
  if (!rows.length) return []
  const items = await db.select().from(bookingItem).where(inArray(bookingItem.bookingId, rows.map((row) => row.id)))
  return rows.map((row) => ({ ...row, items: items.filter((item) => item.bookingId === row.id) }))
}

function toMail(row: typeof booking.$inferSelect, items: Array<{ name: string; quantity: number }>): BookingMail {
  return { ...row, items }
}

export async function createBooking(raw: unknown): Promise<ActionResult<{ total: number; days: number; deposit: number; deliveryFee: number }>> {
  let user
  try { user = await requireUser() } catch { return { ok: false, error: "Du skal logge ind for at booke.", unauthorized: true } }

  let input
  try { input = parseBookingInput(raw) } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Ugyldig forespørgsel" } }

  // Navn, priser og depositum hentes altid fra databasen, aldrig fra klienten.
  const [selected] = await db.select().from(machine).where(and(eq(machine.slug, input.machineSlug), eq(machine.active, true))).limit(1)
  if (!selected) return { ok: false, error: "Maskinen findes ikke længere" }

  const delivery = input.deliveryType === "delivery"
  if (delivery && !selected.deliveryAvailable) return { ok: false, error: "Denne maskine kan desværre ikke leveres. Vælg afhentning." }

  let zone = null
  if (delivery) {
    const zones = await db.select().from(deliveryZone).where(eq(deliveryZone.active, true))
    zone = findDeliveryZone(zones, input.deliveryPostalCode ?? "")
    if (!zone) return { ok: false, error: "Vi leverer desværre ikke til det postnummer. Kontakt os, eller vælg afhentning." }
  }

  const accessoryIds = input.accessories.map((item) => item.id)
  const accessoryRows = accessoryIds.length
    ? await db.select().from(accessory).where(and(inArray(accessory.id, accessoryIds), eq(accessory.machineId, selected.id), eq(accessory.active, true)))
    : []
  if (accessoryRows.length !== accessoryIds.length) return { ok: false, error: "Noget af tilbehøret findes ikke længere. Opdater siden og prøv igen." }
  const chosen = accessoryRows.map((row) => ({ row, quantity: input.accessories.find((item) => item.id === row.id)?.quantity ?? 1 }))

  // To perioder overlapper, hvis den ene starter senest den dag, den anden slutter, og omvendt.
  // Begge datoer er inklusive, så en booking 10.–12. blokerer også en ny booking, der starter den 12.
  const [conflict] = await db.select({ id: booking.id }).from(booking).where(and(eq(booking.machineSlug, input.machineSlug), ne(booking.status, "cancelled"), lte(booking.startDate, input.endDate), gte(booking.endDate, input.startDate))).limit(1)
  if (conflict) return { ok: false, error: OVERLAP_MESSAGE }

  const days = rentalDays(input.startDate, input.endDate)
  const quote = calculateQuote({
    days,
    dailyPrice: selected.dailyPrice,
    machineDeposit: selected.deposit,
    delivery,
    zone,
    accessories: chosen.map(({ row, quantity }) => ({ dailyPrice: row.dailyPrice, deposit: row.deposit, quantity })),
  })

  const id = randomUUID()
  let created: typeof booking.$inferSelect
  try {
    created = await db.transaction(async (tx) => {
      const [row] = await tx.insert(booking).values({
        id,
        userId: user.id,
        machineName: selected.name,
        machineSlug: input.machineSlug,
        startDate: input.startDate,
        endDate: input.endDate,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        notes: input.notes,
        deliveryType: input.deliveryType,
        deliveryAddress: input.deliveryAddress,
        deliveryPostalCode: input.deliveryPostalCode,
        deliveryFee: quote.deliveryFee,
        deposit: quote.deposit,
        total: quote.total,
        status: "pending",
      }).returning()
      if (chosen.length) {
        // unitPrice er prisen pr. dag, så linjen kan forklares senere, også hvis tilbehørets pris ændres.
        await tx.insert(bookingItem).values(chosen.map(({ row, quantity }) => ({ id: randomUUID(), bookingId: id, accessoryId: row.id, name: row.name, quantity, unitPrice: row.dailyPrice })))
      }
      return row
    })
  } catch (error) {
    // 23P01 = exclusion_violation: databasen afviste en samtidig, overlappende booking.
    if (errorCode(error) === "23P01") return { ok: false, error: OVERLAP_MESSAGE }
    throw error
  }

  // Mails sendes efter svaret er givet, så de aldrig kan vælte eller forsinke en booking.
  const mail = toMail(created, chosen.map(({ row, quantity }) => ({ name: row.name, quantity })))
  after(() => sendBookingReceived(mail))

  revalidatePath("/min-konto")
  revalidatePath("/admin")
  revalidatePath(`/maskiner/${input.machineSlug}`)
  return { ok: true, total: quote.total, days, deposit: quote.deposit, deliveryFee: quote.deliveryFee }
}

/** Kunden annullerer selv sin egen booking (indtil dagen før start). */
export async function cancelMyBooking(id: string): Promise<ActionResult> {
  let user
  try { user = await requireUser() } catch { return { ok: false, error: "Du skal logge ind.", unauthorized: true } }
  if (typeof id !== "string" || !id) return { ok: false, error: "Ugyldig booking" }

  const [existing] = await db.select().from(booking).where(and(eq(booking.id, id), eq(booking.userId, user.id))).limit(1)
  if (!existing) return { ok: false, error: "Bookingen findes ikke" }
  if (existing.status === "cancelled") return { ok: true }
  if (!canCancelBooking(existing.startDate, existing.status)) return { ok: false, error: "Bookingen kan ikke længere annulleres online. Kontakt os på telefon." }

  const [updated] = await db.update(booking).set({ status: "cancelled", updatedAt: new Date() }).where(and(eq(booking.id, id), eq(booking.userId, user.id))).returning()
  const items = await db.select().from(bookingItem).where(eq(bookingItem.bookingId, id))
  const mail = toMail(updated, items)
  after(() => sendCancelledByCustomer(mail))

  revalidatePath("/min-konto")
  revalidatePath("/admin")
  revalidatePath(`/maskiner/${existing.machineSlug}`)
  return { ok: true }
}

export async function getMyBookings() {
  const user = await requireUser()
  return withItems(await db.select().from(booking).where(eq(booking.userId, user.id)).orderBy(desc(booking.createdAt)))
}

export async function getAdminBookings() {
  await requireAdmin()
  return withItems(await db.select().from(booking).orderBy(desc(booking.createdAt)))
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { ok: false, error: "Du har ikke adgang til at ændre bookinger." } }
  if (typeof id !== "string" || !id || !BOOKING_STATUSES.includes(status)) return { ok: false, error: "Ugyldig status" }

  try {
    const [before] = await db.select({ status: booking.status }).from(booking).where(eq(booking.id, id)).limit(1)
    if (!before) return { ok: false, error: "Bookingen findes ikke" }
    if (before.status === status) return { ok: true }
    const [updated] = await db.update(booking).set({ status, updatedAt: new Date() }).where(eq(booking.id, id)).returning()
    if (status === "confirmed" || status === "cancelled") {
      const items = await db.select().from(bookingItem).where(eq(bookingItem.bookingId, id))
      const mail = toMail(updated, items)
      after(() => sendStatusChanged(mail, status))
    }
    revalidatePath(`/maskiner/${updated.machineSlug}`)
  } catch (error) {
    // Genbekræftelse af en booking, der overlapper en anden aktiv booking, afvises af databasen.
    if (errorCode(error) === "23P01") return { ok: false, error: "Kan ikke genåbne bookingen: perioden er blevet booket af en anden." }
    throw error
  }

  revalidatePath("/admin")
  revalidatePath("/min-konto")
  return { ok: true }
}
