'use server'

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { accessory, booking, bookingEvent, bookingItem, deliveryZone, favoriteMachine, inspectionReport, machine, maintenanceEvent, rentalReturn } from "@/lib/db/schema"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"
import { and, desc, eq, gt, ilike, inArray, lt, ne, or } from "drizzle-orm"
import { calculateRentalPrice } from "@/lib/pricing"

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error("Unauthorized")
  return session.user.id
}

export async function createBooking(input: { machineName: string; machineSlug: string; startDate: string; endDate: string; customerName: string; customerEmail: string; customerPhone: string; deliveryType: "collection" | "delivery"; deliveryAddress?: string; deliveryPostalCode?: string; accessoryIds?: string[]; acceptTerms: boolean; notes?: string }) {
  const userId = await getUserId()
  if (!input.startDate || !input.endDate || input.endDate < input.startDate) throw new Error("Ugyldige datoer")
  if (input.deliveryType === "delivery" && (!input.deliveryAddress || !input.deliveryPostalCode)) throw new Error("Indtast leveringsadresse og postnummer")
  if (!input.acceptTerms) throw new Error("Du skal acceptere handelsbetingelserne")
  const selectedMachine = await db.select({ id: machine.id, dailyPrice: machine.dailyPrice, deposit: machine.deposit }).from(machine).where(and(eq(machine.slug, input.machineSlug), eq(machine.active, true))).limit(1)
  if (!selectedMachine[0]) throw new Error("Maskinen findes ikke længere")
  const selectedZone = input.deliveryType === "delivery" && input.deliveryPostalCode ? await db.select({ deliveryFee: deliveryZone.deliveryFee }).from(deliveryZone).where(or(eq(deliveryZone.postalCodes, "*"), ilike(deliveryZone.postalCodes, `%${input.deliveryPostalCode}%`))).limit(1) : []
  const selectedAccessories = input.accessoryIds?.length ? await db.select({ id: accessory.id, name: accessory.name, dailyPrice: accessory.dailyPrice }).from(accessory).where(and(inArray(accessory.id, input.accessoryIds), eq(accessory.machineId, selectedMachine[0].id), eq(accessory.active, true))) : []
  if (input.accessoryIds?.length && selectedAccessories.length !== input.accessoryIds.length) throw new Error("Ugyldigt tilbehør")
  const pricing = calculateRentalPrice({ dailyPrice: selectedMachine[0].dailyPrice, deposit: selectedMachine[0].deposit, startDate: input.startDate, endDate: input.endDate, deliveryFee: selectedZone[0]?.deliveryFee || 0, accessoryTotal: selectedAccessories.reduce((sum, item) => sum + item.dailyPrice, 0) })
  const conflicts = await db.select({ id: booking.id }).from(booking).where(and(eq(booking.machineSlug, input.machineSlug), ne(booking.status, "cancelled"), lt(booking.startDate, input.endDate), gt(booking.endDate, input.startDate))).limit(1)
  if (conflicts.length) throw new Error("Maskinen er allerede booket i den periode")
  const bookingId = randomUUID()
  await db.insert(booking).values({ id: bookingId, userId, machineName: input.machineName, machineSlug: input.machineSlug, startDate: input.startDate, endDate: input.endDate, customerName: input.customerName, customerEmail: input.customerEmail, customerPhone: input.customerPhone, deliveryType: input.deliveryType, deliveryAddress: input.deliveryAddress || null, deliveryPostalCode: input.deliveryPostalCode || null, notes: input.notes || null, total: pricing.total, status: "pending" })
  if (selectedAccessories.length) await db.insert(bookingItem).values(selectedAccessories.map((item) => ({ id: randomUUID(), bookingId, accessoryId: item.id, name: item.name, quantity: 1, unitPrice: item.dailyPrice })))
  await db.insert(bookingEvent).values({ id: randomUUID(), bookingId, type: "created", message: "Bookingforespørgsel oprettet", createdBy: userId })
  revalidatePath("/min-konto")
  revalidatePath("/admin")
  return { ok: true }
}

export async function toggleFavoriteMachine(machineId: string) { const userId = await getUserId(); const existing = await db.select({ id: favoriteMachine.id }).from(favoriteMachine).where(and(eq(favoriteMachine.userId, userId), eq(favoriteMachine.machineId, machineId))).limit(1); if (existing[0]) await db.delete(favoriteMachine).where(eq(favoriteMachine.id, existing[0].id)); else await db.insert(favoriteMachine).values({ id: randomUUID(), userId, machineId }); revalidatePath("/min-konto"); return { saved: !existing[0] } }

export async function getFavoriteMachines() { const userId = await getUserId(); return db.select({ id: favoriteMachine.id, machineId: favoriteMachine.machineId, name: machine.name, slug: machine.slug, image: machine.image, dailyPrice: machine.dailyPrice }).from(favoriteMachine).innerJoin(machine, eq(machine.id, favoriteMachine.machineId)).where(eq(favoriteMachine.userId, userId)) }

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

export async function createMaintenanceEvent(input: { machineId: string; type: string; notes?: string; cost?: number; scheduledFor?: string }) { const userId = await getUserId(); await db.insert(maintenanceEvent).values({ id: randomUUID(), machineId: input.machineId, type: input.type, notes: input.notes || "", cost: input.cost || 0, scheduledFor: input.scheduledFor || null, createdBy: userId }); revalidatePath("/admin"); return { ok: true } }

export async function recordRentalReturn(input: { bookingId: string; condition: string; damageNotes?: string; extraCharge?: number }) { const userId = await getUserId(); await db.insert(rentalReturn).values({ id: randomUUID(), bookingId: input.bookingId, condition: input.condition, damageNotes: input.damageNotes || "", extraCharge: input.extraCharge || 0, createdBy: userId }); await db.update(booking).set({ status: "completed", updatedAt: new Date() }).where(eq(booking.id, input.bookingId)); revalidatePath("/admin"); return { ok: true } }

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
