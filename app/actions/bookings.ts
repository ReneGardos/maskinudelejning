'use server'

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { booking, bookingEvent, inspectionReport, machine } from "@/lib/db/schema"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"
import { and, desc, eq, gt, lt, ne } from "drizzle-orm"
import { calculateRentalPrice } from "@/lib/pricing"

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

export async function createBooking(input: { machineName: string; machineSlug: string; startDate: string; endDate: string; customerName: string; customerEmail: string; customerPhone: string; deliveryType: "collection" | "delivery"; deliveryAddress?: string; deliveryPostalCode?: string; notes?: string }) {
  const userId = await getUserId()
  if (!input.startDate || !input.endDate || input.endDate < input.startDate) throw new Error("Ugyldige datoer")
  if (input.deliveryType === "delivery" && (!input.deliveryAddress || !input.deliveryPostalCode)) throw new Error("Indtast leveringsadresse og postnummer")
  const selectedMachine = await db.select({ dailyPrice: machine.dailyPrice, deposit: machine.deposit }).from(machine).where(and(eq(machine.slug, input.machineSlug), eq(machine.active, true))).limit(1)
  if (!selectedMachine[0]) throw new Error("Maskinen findes ikke længere")
  const pricing = calculateRentalPrice({ dailyPrice: selectedMachine[0].dailyPrice, deposit: selectedMachine[0].deposit, startDate: input.startDate, endDate: input.endDate })
  const conflicts = await db.select({ id: booking.id }).from(booking).where(and(eq(booking.machineSlug, input.machineSlug), ne(booking.status, "cancelled"), lt(booking.startDate, input.endDate), gt(booking.endDate, input.startDate))).limit(1)
  if (conflicts.length) throw new Error("Maskinen er allerede booket i den periode")
  const bookingId = randomUUID()
  await db.insert(booking).values({ id: bookingId, userId, ...input, notes: input.notes || null, total: pricing.total, status: "pending" })
  await db.insert(bookingEvent).values({ id: randomUUID(), bookingId, type: "created", message: "Bookingforespørgsel oprettet", createdBy: userId })
  revalidatePath("/min-konto")
  revalidatePath("/admin")
  return { ok: true }
}

export async function getMyBookings() {
  const userId = await getUserId()
  return db.select().from(booking).where(eq(booking.userId, userId)).orderBy(desc(booking.createdAt))
}

export async function getBookingEvents(bookingId: string) {
  const userId = await getUserId()
  const owned = await db.select({ id: booking.id }).from(booking).where(and(eq(booking.id, bookingId), eq(booking.userId, userId))).limit(1)
  if (!owned.length) throw new Error("Unauthorized")
  return db.select().from(bookingEvent).where(eq(bookingEvent.bookingId, bookingId)).orderBy(desc(bookingEvent.createdAt))
}

export async function saveInspectionReport(input: { bookingId: string; phase: "handover" | "return"; checklist: string[]; notes?: string; photos?: string[] }) {
  const userId = await getUserId()
  const id = randomUUID()
  await db.insert(inspectionReport).values({ id, bookingId: input.bookingId, phase: input.phase, checklist: input.checklist, notes: input.notes || "", photos: input.photos || [], createdBy: userId })
  await db.insert(bookingEvent).values({ id: randomUUID(), bookingId: input.bookingId, type: `inspection_${input.phase}`, message: `${input.phase === "handover" ? "Udlevering" : "Retur"} registreret`, createdBy: userId })
  revalidatePath("/admin")
  return { ok: true, id }
}

export async function getAdminBookings() {
  await getUserId()
  return db.select().from(booking).orderBy(desc(booking.createdAt))
}

export async function updateBookingStatus(id: string, status: "pending" | "confirmed" | "cancelled") {
  const userId = await getUserId()
  await db.update(booking).set({ status, updatedAt: new Date() }).where(eq(booking.id, id))
  await db.insert(bookingEvent).values({ id: randomUUID(), bookingId: id, type: status, message: `Status ændret til ${status}`, createdBy: userId })
  revalidatePath("/admin")
  revalidatePath("/min-konto")
}
