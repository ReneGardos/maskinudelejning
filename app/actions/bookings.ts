'use server'

import { db } from "@/lib/db"
import { accessory, booking, bookingItem, bookingOrder, customerDiscount, deliveryZone, discountCode, machine } from "@/lib/db/schema"
import { requireAdmin, requireUser } from "@/lib/session"
import { BOOKING_STATUSES, type BookingStatus, canCancelOrder, normalizeCode, parseOrderInput, rentalDays, todayInDenmark } from "@/lib/booking-rules"
import { type ActionResult, errorCode } from "@/lib/action-result"
import { calculateOrder, type DiscountCodeRule, evaluateDiscountCode, findDeliveryZone } from "@/lib/pricing"
import { type OrderMail, sendOrderCancelledByCustomer, sendOrderReceived, sendOrderStatusChanged } from "@/lib/email"
import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { randomUUID } from "crypto"
import { and, desc, eq, gte, inArray, isNull, lt, lte, ne, or, sql, type SQL } from "drizzle-orm"

const CODE_USED_UP = "CODE_USED_UP"

type OrderRow = typeof bookingOrder.$inferSelect
type BookingRow = typeof booking.$inferSelect
type ItemRow = typeof bookingItem.$inferSelect
export type OrderWithLines = OrderRow & { lines: Array<BookingRow & { items: ItemRow[] }> }

/** Hent ordrer med deres maskiner (bookinger) og tilbehør. */
async function loadOrders(where?: SQL): Promise<OrderWithLines[]> {
  const orders = await db.select().from(bookingOrder).where(where).orderBy(desc(bookingOrder.createdAt))
  if (!orders.length) return []
  const lines = await db.select().from(booking).where(inArray(booking.orderId, orders.map((order) => order.id))).orderBy(booking.startDate)
  const items = lines.length ? await db.select().from(bookingItem).where(inArray(bookingItem.bookingId, lines.map((line) => line.id))) : []
  return orders.map((order) => ({
    ...order,
    lines: lines.filter((line) => line.orderId === order.id).map((line) => ({ ...line, items: items.filter((item) => item.bookingId === line.id) })),
  }))
}

function toMail(order: OrderWithLines): OrderMail {
  return {
    ...order,
    lines: order.lines.map((line) => ({ machineName: line.machineName, startDate: line.startDate, endDate: line.endDate, items: line.items.map((item) => ({ name: item.name, quantity: item.quantity })) })),
  }
}

function refresh(slugs: string[]) {
  revalidatePath("/min-konto")
  revalidatePath("/admin")
  revalidatePath("/admin/kunder")
  for (const slug of new Set(slugs)) revalidatePath(`/maskiner/${slug}`)
}

/** Kundens egen faste rabat i procent (0, hvis ingen). */
async function getCustomerPercent(userId: string) {
  const [row] = await db.select({ percent: customerDiscount.percent }).from(customerDiscount).where(eq(customerDiscount.userId, userId)).limit(1)
  return row?.percent ?? 0
}

function toRule(row: typeof discountCode.$inferSelect): DiscountCodeRule {
  return { code: row.code, kind: row.kind, value: row.value, minSubtotal: row.minSubtotal, validFrom: row.validFrom, validUntil: row.validUntil, maxUses: row.maxUses, usedCount: row.usedCount, active: row.active }
}

/** Bookingsiden tjekker en rabatkode, så prisen kan vises. Selve rabatten beregnes igen på serveren ved afsendelse. */
export async function checkDiscountCode(raw: string): Promise<ActionResult<{ rule: DiscountCodeRule }>> {
  try { await requireUser() } catch { return { ok: false, error: "Log ind for at bruge en rabatkode.", unauthorized: true } }
  const code = normalizeCode(typeof raw === "string" ? raw : "")
  if (!code || code.length > 40) return { ok: false, error: "Indtast en rabatkode" }
  const [row] = await db.select().from(discountCode).where(eq(discountCode.code, code)).limit(1)
  if (!row || !row.active) return { ok: false, error: "Rabatkoden findes ikke" }
  const check = evaluateDiscountCode(toRule(row), Number.MAX_SAFE_INTEGER, todayInDenmark())
  if ("error" in check) return { ok: false, error: check.error }
  return { ok: true, rule: toRule(row) }
}

export async function createOrder(raw: unknown): Promise<ActionResult<{ orderNumber: number | null; total: number }>> {
  let user
  try { user = await requireUser() } catch { return { ok: false, error: "Du skal logge ind for at booke.", unauthorized: true } }

  let input
  try { input = parseOrderInput(raw) } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Ugyldig forespørgsel" } }

  // Navne, priser og depositum hentes altid fra databasen, aldrig fra klienten.
  const slugs = Array.from(new Set(input.lines.map((line) => line.machineSlug)))
  const machines = await db.select().from(machine).where(and(inArray(machine.slug, slugs), eq(machine.active, true)))
  const bySlug = new Map(machines.map((row) => [row.slug, row]))
  const missing = slugs.find((slug) => !bySlug.has(slug))
  if (missing) return { ok: false, error: "En af maskinerne findes ikke længere. Opdater siden og prøv igen." }

  const delivery = input.deliveryType === "delivery"
  if (delivery) {
    const notDeliverable = machines.find((row) => !row.deliveryAvailable)
    if (notDeliverable) return { ok: false, error: `${notDeliverable.name} kan desværre ikke leveres. Vælg afhentning, eller fjern maskinen.` }
  }
  let zone = null
  if (delivery) {
    const zones = await db.select().from(deliveryZone).where(eq(deliveryZone.active, true))
    zone = findDeliveryZone(zones, input.deliveryPostalCode ?? "")
    if (!zone) return { ok: false, error: "Vi leverer desværre ikke til det postnummer. Kontakt os, eller vælg afhentning." }
  }

  const accessoryIds = Array.from(new Set(input.lines.flatMap((line) => line.accessories.map((item) => item.id))))
  const accessoryRows = accessoryIds.length ? await db.select().from(accessory).where(and(inArray(accessory.id, accessoryIds), eq(accessory.active, true))) : []
  const accessoryById = new Map(accessoryRows.map((row) => [row.id, row]))

  type Chosen = { row: typeof accessory.$inferSelect; quantity: number }
  type PricedLine = (typeof input.lines)[number] & { machine: typeof machine.$inferSelect; chosen: Chosen[]; days: number }
  const lines: PricedLine[] = []
  for (const [index, line] of input.lines.entries()) {
    const selected = bySlug.get(line.machineSlug)!
    const chosen: Chosen[] = []
    for (const item of line.accessories) {
      const row = accessoryById.get(item.id)
      if (!row || row.machineId !== selected.id) return { ok: false, error: `Noget af tilbehøret til ${selected.name} findes ikke længere. Opdater siden og prøv igen.` }
      chosen.push({ row, quantity: item.quantity })
    }
    // Begge datoer er inklusive, så en booking 10.–12. blokerer også en ny booking, der starter den 12.
    const [conflict] = await db.select({ id: booking.id }).from(booking).where(and(eq(booking.machineSlug, line.machineSlug), ne(booking.status, "cancelled"), lte(booking.startDate, line.endDate), gte(booking.endDate, line.startDate))).limit(1)
    if (conflict) return { ok: false, error: `${selected.name} (maskine ${index + 1}) er allerede booket i hele eller dele af perioden. Vælg andre datoer.` }
    lines.push({ ...line, machine: selected, chosen, days: rentalDays(line.startDate, line.endDate) })
  }

  let codeRow: typeof discountCode.$inferSelect | undefined
  if (input.discountCode) {
    ;[codeRow] = await db.select().from(discountCode).where(eq(discountCode.code, input.discountCode)).limit(1)
    if (!codeRow || !codeRow.active) return { ok: false, error: "Rabatkoden findes ikke" }
  }

  const today = todayInDenmark()
  const quote = calculateOrder({
    lines: lines.map((line) => ({ days: line.days, dailyPrice: line.machine.dailyPrice, machineDeposit: line.machine.deposit, accessories: line.chosen.map(({ row, quantity }) => ({ dailyPrice: row.dailyPrice, deposit: row.deposit, quantity })) })),
    delivery,
    zone,
    customerPercent: await getCustomerPercent(user.id),
    code: codeRow ? toRule(codeRow) : null,
    today,
  })
  if (codeRow && quote.discountSource !== "code" && quote.codeError && quote.discountSource !== "customer") return { ok: false, error: quote.codeError }

  const orderId = randomUUID()
  let created: OrderRow
  try {
    created = await db.transaction(async (tx) => {
      if (quote.discountSource === "code" && codeRow) {
        // Tæl brugen op i samme transaktion, så en kode med et loft ikke kan bruges for mange gange samtidig.
        const used = await tx.update(discountCode).set({ usedCount: sql`${discountCode.usedCount} + 1`, updatedAt: new Date() })
          .where(and(eq(discountCode.id, codeRow.id), eq(discountCode.active, true), or(isNull(discountCode.maxUses), lt(discountCode.usedCount, discountCode.maxUses))))
          .returning({ id: discountCode.id })
        if (!used.length) throw new Error(CODE_USED_UP)
      }
      const [order] = await tx.insert(bookingOrder).values({
        id: orderId,
        userId: user.id,
        customerName: input.customerName,
        customerEmail: input.customerEmail,
        customerPhone: input.customerPhone,
        company: input.company,
        notes: input.notes,
        deliveryType: input.deliveryType,
        deliveryAddress: input.deliveryAddress,
        deliveryPostalCode: input.deliveryPostalCode,
        deliveryFee: quote.deliveryFee,
        subtotal: quote.subtotal,
        discountAmount: quote.discount,
        discountLabel: quote.discountLabel,
        discountCodeId: quote.discountSource === "code" && codeRow ? codeRow.id : null,
        total: quote.total,
        deposit: quote.deposit,
        status: "pending",
      }).returning()

      for (const [index, line] of lines.entries()) {
        const bookingId = randomUUID()
        await tx.insert(booking).values({
          id: bookingId,
          orderId,
          userId: user.id,
          machineName: line.machine.name,
          machineSlug: line.machineSlug,
          startDate: line.startDate,
          endDate: line.endDate,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          notes: input.notes,
          deliveryType: input.deliveryType,
          deliveryAddress: input.deliveryAddress,
          deliveryPostalCode: input.deliveryPostalCode,
          // Levering og rabat står på selve ordren. Linjen viser leje + tilbehør for maskinen.
          deliveryFee: 0,
          deposit: quote.lines[index].deposit,
          total: quote.lines[index].subtotal,
          status: "pending",
        })
        if (line.chosen.length) {
          // unitPrice er prisen pr. dag, så linjen kan forklares senere, også hvis tilbehørets pris ændres.
          await tx.insert(bookingItem).values(line.chosen.map(({ row, quantity }) => ({ id: randomUUID(), bookingId, accessoryId: row.id, name: row.name, quantity, unitPrice: row.dailyPrice })))
        }
      }
      return order
    })
  } catch (error) {
    if (error instanceof Error && error.message === CODE_USED_UP) return { ok: false, error: "Rabatkoden er netop blevet brugt op." }
    // 23P01 = exclusion_violation: databasen afviste en samtidig, overlappende booking.
    if (errorCode(error) === "23P01") return { ok: false, error: "En af maskinerne er netop blevet booket i den periode. Vælg andre datoer." }
    throw error
  }

  const mail: OrderMail = {
    ...created,
    lines: lines.map((line) => ({ machineName: line.machine.name, startDate: line.startDate, endDate: line.endDate, items: line.chosen.map(({ row, quantity }) => ({ name: row.name, quantity })) })),
  }
  // Mails sendes efter svaret er givet, så de aldrig kan vælte eller forsinke en booking.
  after(() => sendOrderReceived(mail))
  refresh(slugs)
  return { ok: true, orderNumber: created.orderNumber, total: created.total }
}

/** Kunden annullerer selv hele sin booking (indtil dagen før første maskine starter). */
export async function cancelMyOrder(orderId: string): Promise<ActionResult> {
  let user
  try { user = await requireUser() } catch { return { ok: false, error: "Du skal logge ind.", unauthorized: true } }
  if (typeof orderId !== "string" || !orderId) return { ok: false, error: "Ugyldig booking" }

  const [order] = await loadOrders(and(eq(bookingOrder.id, orderId), eq(bookingOrder.userId, user.id)))
  if (!order) return { ok: false, error: "Bookingen findes ikke" }
  if (order.status === "cancelled") return { ok: true }
  if (!canCancelOrder(order.lines)) return { ok: false, error: "Bookingen kan ikke længere annulleres online. Kontakt os på telefon." }

  const now = new Date()
  await db.transaction(async (tx) => {
    await tx.update(bookingOrder).set({ status: "cancelled", updatedAt: now }).where(and(eq(bookingOrder.id, orderId), eq(bookingOrder.userId, user.id)))
    await tx.update(booking).set({ status: "cancelled", updatedAt: now }).where(and(eq(booking.orderId, orderId), eq(booking.userId, user.id)))
  })
  const mail = toMail(order)
  after(() => sendOrderCancelledByCustomer(mail))
  refresh(order.lines.map((line) => line.machineSlug))
  return { ok: true }
}

export async function getMyOrders() {
  const user = await requireUser()
  return loadOrders(eq(bookingOrder.userId, user.id))
}

export async function getAdminOrders() {
  await requireAdmin()
  return loadOrders()
}

/** Admin bekræfter eller annullerer en hel booking. Alle maskiner i bookingen får samme status. */
export async function updateOrderStatus(orderId: string, status: BookingStatus): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { ok: false, error: "Du har ikke adgang til at ændre bookinger." } }
  if (typeof orderId !== "string" || !orderId || !BOOKING_STATUSES.includes(status)) return { ok: false, error: "Ugyldig status" }

  const [order] = await loadOrders(eq(bookingOrder.id, orderId))
  if (!order) return { ok: false, error: "Bookingen findes ikke" }
  if (order.status === status) return { ok: true }

  try {
    const now = new Date()
    await db.transaction(async (tx) => {
      await tx.update(bookingOrder).set({ status, updatedAt: now }).where(eq(bookingOrder.id, orderId))
      await tx.update(booking).set({ status, updatedAt: now }).where(eq(booking.orderId, orderId))
    })
  } catch (error) {
    // Genåbning af en annulleret booking, hvor en maskine imens er booket af en anden, afvises af databasen.
    if (errorCode(error) === "23P01") return { ok: false, error: "Kan ikke genåbne bookingen: en af maskinerne er blevet booket af en anden i perioden." }
    throw error
  }

  if (status === "confirmed" || status === "cancelled") {
    const mail = toMail({ ...order, status })
    after(() => sendOrderStatusChanged(mail, status))
  }
  refresh(order.lines.map((line) => line.machineSlug))
  return { ok: true }
}
