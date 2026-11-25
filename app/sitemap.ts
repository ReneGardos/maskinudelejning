import type { MetadataRoute } from "next"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { machine } from "@/lib/db/schema"
import { SITE_URL } from "@/lib/site"

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const machines = await db.select({ slug: machine.slug, updatedAt: machine.updatedAt }).from(machine).where(eq(machine.active, true))
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/maskiner`, changeFrequency: "daily", priority: 0.9 },
    ...machines.map((row) => ({ url: `${SITE_URL}/maskiner/${row.slug}`, lastModified: row.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    { url: `${SITE_URL}/handelsbetingelser`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privatlivspolitik`, changeFrequency: "yearly", priority: 0.2 },
  ]
}
