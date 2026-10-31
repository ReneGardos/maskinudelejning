import { put } from "@vercel/blob"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const formData = await request.formData()
  const file = formData.get("file")
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided" }, { status: 400 })
  if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Only images up to 8 MB are allowed" }, { status: 400 })
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-")
  const blob = await put(`inspections/${session.user.id}/${crypto.randomUUID()}-${safeName}`, file, { access: "private", addRandomSuffix: false })
  return NextResponse.json({ pathname: blob.pathname })
}
