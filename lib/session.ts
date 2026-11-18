import { headers } from "next/headers"
import { auth } from "@/lib/auth"

export type SessionUser = { id: string; name: string; email: string; role: "user" | "admin" }

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) return null
  const user = session.user as typeof session.user & { role?: string }
  return { id: user.id, name: user.name, email: user.email, role: user.role === "admin" ? "admin" : "user" }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (!user) throw new Error("Unauthorized")
  return user
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser()
  if (user.role !== "admin") throw new Error("Forbidden")
  return user
}
