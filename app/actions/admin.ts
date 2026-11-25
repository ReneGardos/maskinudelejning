'use server'

import { randomUUID } from "crypto"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { accessory, deliveryZone, machine } from "@/lib/db/schema"
import { requireAdmin } from "@/lib/session"
import { parseAccessoryInput, parseMachineInput, parseZoneInput } from "@/lib/admin-rules"
import { type ActionResult, errorCode } from "@/lib/action-result"

const FORBIDDEN = "Du har ikke adgang til at ændre dette."

function refreshCatalogue(slug?: string) {
  revalidatePath("/")
  revalidatePath("/maskiner")
  if (slug) revalidatePath(`/maskiner/${slug}`)
  revalidatePath("/admin/maskiner")
  revalidatePath("/admin/zoner")
}

/** Opret eller opdatér en maskine. Adressen (slug) kan ikke ændres bagefter, fordi bookinger peger på den. */
export async function saveMachine(raw: unknown): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { ok: false, error: FORBIDDEN } }
  let input
  try { input = parseMachineInput(raw) } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Ugyldigt input" } }

  try {
    if (input.id) {
      const [existing] = await db.select({ slug: machine.slug }).from(machine).where(eq(machine.id, input.id)).limit(1)
      if (!existing) return { ok: false, error: "Maskinen findes ikke" }
      await db.update(machine).set({
        name: input.name, category: input.category, description: input.description, dailyPrice: input.dailyPrice, deposit: input.deposit,
        image: input.image, manufacturer: input.manufacturer, model: input.model, specifications: input.specifications,
        active: input.active, deliveryAvailable: input.deliveryAvailable, updatedAt: new Date(),
      }).where(eq(machine.id, input.id))
      refreshCatalogue(existing.slug)
    } else {
      await db.insert(machine).values({
        id: `machine-${input.slug}`, slug: input.slug, name: input.name, category: input.category, description: input.description,
        dailyPrice: input.dailyPrice, deposit: input.deposit, image: input.image, manufacturer: input.manufacturer, model: input.model,
        specifications: input.specifications, active: input.active, deliveryAvailable: input.deliveryAvailable,
      })
      refreshCatalogue(input.slug)
    }
  } catch (error) {
    // 23505 = unique_violation (adressen er i brug)
    if (errorCode(error) === "23505") return { ok: false, error: "Der findes allerede en maskine med den adresse (slug)." }
    throw error
  }
  return { ok: true }
}

export async function saveAccessory(raw: unknown): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { ok: false, error: FORBIDDEN } }
  let input
  try { input = parseAccessoryInput(raw) } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Ugyldigt input" } }

  const [owner] = await db.select({ slug: machine.slug }).from(machine).where(eq(machine.id, input.machineId)).limit(1)
  if (!owner) return { ok: false, error: "Maskinen findes ikke" }

  if (input.id) {
    const updated = await db.update(accessory).set({
      name: input.name, description: input.description, dailyPrice: input.dailyPrice, deposit: input.deposit, active: input.active, updatedAt: new Date(),
    }).where(eq(accessory.id, input.id)).returning({ id: accessory.id })
    if (!updated.length) return { ok: false, error: "Tilbehøret findes ikke" }
  } else {
    await db.insert(accessory).values({
      id: `accessory-${randomUUID().slice(0, 8)}`, machineId: input.machineId, name: input.name, description: input.description,
      dailyPrice: input.dailyPrice, deposit: input.deposit, active: input.active,
    })
  }
  refreshCatalogue(owner.slug)
  return { ok: true }
}

export async function saveZone(raw: unknown): Promise<ActionResult> {
  try { await requireAdmin() } catch { return { ok: false, error: FORBIDDEN } }
  let input
  try { input = parseZoneInput(raw) } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Ugyldigt input" } }

  if (input.id) {
    const updated = await db.update(deliveryZone).set({
      name: input.name, postalCodes: input.postalCodes, deliveryFee: input.deliveryFee, collectionFee: input.collectionFee, active: input.active, updatedAt: new Date(),
    }).where(eq(deliveryZone.id, input.id)).returning({ id: deliveryZone.id })
    if (!updated.length) return { ok: false, error: "Zonen findes ikke" }
  } else {
    await db.insert(deliveryZone).values({
      id: `zone-${randomUUID().slice(0, 8)}`, name: input.name, postalCodes: input.postalCodes, deliveryFee: input.deliveryFee, collectionFee: input.collectionFee, active: input.active,
    })
  }
  refreshCatalogue()
  return { ok: true }
}
