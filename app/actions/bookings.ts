'use server'

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { booking, machine } from "@/lib/db/schema"
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

export async function createBooking(input: { machineName: string; machineSlug: string; startDate: string; endDate: string; customerName: string; customerEmail: string; customerPhone: string; notes?: string }) {
  const userId = await getUserId()
  if (!input.startDate || !input.endDate || input.endDate < input.startDate) throw new Error("Ugyldige datoer")
  const selectedMachine = await db.select({ dailyPrice: machine.dailyPrice, deposit: machine.deposit }).from(machine).where(and(eq(machine.slug, input.machineSlug), eq(machine.active, true))).limit(1)
  if (!selectedMachine[0]) throw new Error("Maskinen findes ikke længere")
  const pricing = calculateRentalPrice({ dailyPrice: selectedMachine[0].dailyPrice, deposit: selectedMachine[0].deposit, startDate: input.startDate, endDate: input.endDate })
  const conflicts = await db.select({ id: booking.id }).from(booking).where(and(eq(booking.machineSlug, input.machineSlug), ne(booking.status, "cancelled"), lt(booking.startDate, input.endDate), gt(booking.endDate, input.startDate))).limit(1)
  if (conflicts.length) throw new Error("Maskinen er allerede booket i den periode")
  await db.insert(booking).values({ id: randomUUID(), userId, ...input, notes: input.notes || null, total: pricing.total, status: "pending" })
  revalidatePath("/min-konto")
  revalidatePath("/admin")
  return { ok: true }
}

export async function getMyBookings() {
  const userId = await getUserId()
  return db.select().from(booking).where(eq(booking.userId, userId)).orderBy(desc(booking.createdAt))
}

export async function getAdminBookings() {
  await getUserId()
  return db.select().from(booking).orderBy(desc(booking.createdAt))
}

export async function updateBookingStatus(id: string, status: "pending" | "confirmed" | "cancelled") {
  await getUserId()
  await db.update(booking).set({ status, updatedAt: new Date() }).where(eq(booking.id, id))
  revalidatePath("/admin")
  revalidatePath("/min-konto")
}
