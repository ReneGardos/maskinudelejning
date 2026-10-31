"use client"

import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"

export function LogoutButton() {
  const router = useRouter()
  async function logout() { await authClient.signOut(); router.push("/"); router.refresh() }
  return <button type="button" className="logout-button" onClick={logout}>Log ud</button>
}
