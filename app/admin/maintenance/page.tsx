import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { machine } from "@/lib/db/schema"
import { MaintenanceForm } from "@/components/maintenance-form"

export default async function MaintenancePage() { const session = await auth.api.getSession({ headers: await headers() }); if (!session?.user) redirect("/sign-in"); const machines = await db.select({ id: machine.id, name: machine.name }).from(machine).where(eq(machine.active, true)); return <main className="admin-page"><header className="admin-header"><Link href="/admin" className="brand">maskin<span>udlejning</span></Link><Link href="/admin" className="text-link">Tilbage til admin</Link></header><section className="admin-shell"><p className="eyebrow">Driftscenter</p><h1>Vedligeholdelse</h1><p className="muted">Planlæg service, reparationer og rengøring på den centrale maskinliste.</p><MaintenanceForm machines={machines}/></section></main> }
