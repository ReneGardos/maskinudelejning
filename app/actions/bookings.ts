'use server'

import { db } from "@/lib/db"
import { booking, machine } from "@/lib/db/schema"
import { requireAdmin, requireUser } from "@/lib/session"
import { BOOKING_STATUSES, type BookingStatus, canCancelBooking, parseBookingInput, rentalDays } from "@/lib/booking-rules"
import { sendBookingReceived, sendCancelledByCustomer, sendStatusChanged } from "@/lib/email"
import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { randomUUID } from "crypto"
import { and, desc, eq, gte, lte, ne } from "drizzle-orm"

// Fejlbeskeder i server actions bliver skjult i produktion, når de kastes.
// Derfor returnerer vi et resultat, som klienten kan vise direkte.
export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string; unauthorized?: boolean }

const OVERLAP_MESSAGE = "Maskinen er allerede booket i hele eller dele af den periode. Vælg andre datoer."

function errorCode(error: unknown): string | undefined {
  const err = error as { code?: string; cause?: { code?: string } } | null
  return err?.code ?? err?.cause?.code
}

export async function createBooking(raw: unknown): Promise<ActionResult<{ total: number; days: number }>> {
  let user
  try { user = await requireUser() } catch { return { ok: false, error: "Du skal logge ind for at booke.", unauthorized: true } }

  let input
  try { input = parseBookingInput(raw) } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Ugyldig forespørgsel" } }

  // Navn og pris hentes altid fra databasen, aldrig fra klienten.
  const [selected] = await db.select({ name: machine.name, dailyPrice: machine.dailyPrice }).from(machine).where(and(eq(machine.slug, input.machineSlug), eq(machine.active, true))).limit(1)
  if (!selected) return { ok: false, error: "Maskinen findes ikke længere" }

  // To perioder overlapper, hvis den ene starter senest den dag, den anden slutter, og omvendt.
  // Begge datoer er inklusive, så en booking 10.–12. blokerer også en ny booking, der starter den 12.
  const [conflict] = await db.select({ id: booking.id }).from(booking).where(and(eq(booking.machineSlug, input.machineSlug), ne(booking.status, "cancelled"), lte(booking.startDate, input.endDate), gte(booking.endDate, input.startDate))).limit(1)
  if (conflict) return { ok: false, error: OVERLAP_MESSAGE }

  const days = rentalDays(input.startDate, input.endDate)
  const total = days * selected.dailyPrice

  let created
  try {
    ;[created] = await db.insert(booking).values({ id: randomUUID(), userId: user.id, machineName: selected.name, ...input, total, status: "pending" }).returning()
  } catch (error) {
    // 23P01 = exclusion_violation: databasen afviste en samtidig, overlappende booking.
    if (errorCode(error) === "23P01") return { ok: false, error: OVERLAP_MESSAGE }
    throw error
  }

  // Mails sendes efter svaret er givet, så de aldrig kan vælte eller forsinke en booking.
  after(() => sendBookingReceived(created))

  revalidatePath("/min-konto")
  revalidatePath("/admin")
  revalidatePath(`/maskiner/${input.machineSlug}`)
  return { ok: true, total, days }
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
  after(() => sendCancelledByCustomer(updated))

  revalidatePath("/min-konto")
  revalidatePath("/admin")
  revalidatePath(`/maskiner/${existing.machineSlug}`)
  return { ok: true }
}

export async function getMyBookings() {
  const user = await requireUser()
  return db.select().from(booking).where(eq(booking.userId, user.id)).orderBy(desc(booking.createdAt))
}

export async function getAdminBookings() {
  await requireAdmin()
  return db.select().from(booking).orderBy(desc(booking.createdAt))
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { ok: false, error: "Du har ikke adgang til at ændre bookinger." } }
  if (typeof id !== "string" || !id || !BOOKING_STATUSES.includes(status)) return { ok: false, error: "Ugyldig status" }

  try {
    const [before] = await db.select({ status: booking.status }).from(booking).where(eq(booking.id, id)).limit(1)
    if (!before) return { ok: false, error: "Bookingen findes ikke" }
    if (before.status === status) return { ok: true }
    const [updated] = await db.update(booking).set({ status, updatedAt: new Date() }).where(eq(booking.id, id)).returning()
    if (status === "confirmed" || status === "cancelled") after(() => sendStatusChanged(updated, status))
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
