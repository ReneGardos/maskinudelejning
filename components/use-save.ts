"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { ActionResult } from "@/lib/action-result"

/** Fælles håndtering af gem-knapper i admin: viser fejl fra serveren, viser "Gemt" og opdaterer siden. */
export function useSave(action: (raw: unknown) => Promise<ActionResult>, onSuccess?: () => void) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)

  async function run(payload: unknown) {
    setPending(true); setError(""); setSaved(false)
    try {
      const result = await action(payload)
      if (result.ok) {
        setSaved(true)
        router.refresh()
        onSuccess?.()
      } else {
        setError(result.error)
      }
    } catch {
      setError("Der opstod en fejl. Prøv igen.")
    } finally {
      setPending(false)
    }
  }

  return { pending, error, saved, run }
}
