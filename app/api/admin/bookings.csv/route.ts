import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getAdminBookings } from "@/app/actions/bookings"

function csvCell(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"` }

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const rows = await getAdminBookings()
  const header = ["Kunde", "Email", "Maskine", "Fra", "Til", "Status", "Total"].map(csvCell).join(",")
  const body = rows.map((row) => [row.customerName, row.customerEmail, row.machineName, row.startDate, row.endDate, row.status, row.total].map(csvCell).join(","))
  return new NextResponse([header, ...body].join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=bookinger.csv" } })
}
