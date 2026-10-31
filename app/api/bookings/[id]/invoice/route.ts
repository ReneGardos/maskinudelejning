import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { booking } from "@/lib/db/schema"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() }); if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params; const result = await db.select().from(booking).where(and(eq(booking.id, id), eq(booking.userId, session.user.id))).limit(1); const item = result[0]
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const html = `<!doctype html><html lang="da"><head><meta charset="utf-8"><title>Faktura ${item.id}</title><style>body{font-family:Arial,sans-serif;max-width:760px;margin:48px auto;color:#17201d}header{display:flex;justify-content:space-between;border-bottom:2px solid #f47721;padding-bottom:24px}h1{font-size:42px;margin:40px 0 12px}.meta{color:#69746d}table{width:100%;border-collapse:collapse;margin-top:40px}td,th{text-align:left;padding:14px 0;border-bottom:1px solid #ddd}.total{text-align:right;font-size:24px;font-weight:700;margin-top:28px}</style></head><body><header><strong>maskinudlejning</strong><span>Faktura</span></header><h1>Faktura</h1><p class="meta">Booking: ${item.id}<br>Dato: ${new Date().toLocaleDateString("da-DK")}</p><table><tr><th>Maskine</th><th>Periode</th><th>Beløb</th></tr><tr><td>${item.machineName}</td><td>${item.startDate} – ${item.endDate}</td><td>${item.total.toLocaleString("da-DK")} kr.</td></tr></table><p class="total">Total: ${item.total.toLocaleString("da-DK")} kr.</p></body></html>`
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Disposition": `attachment; filename=faktura-${item.id}.html` } })
}
