"use client"

import { useState } from "react"
import { saveInspectionReport } from "@/app/actions/bookings"

export function InspectionForm({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false); const [phase, setPhase] = useState<"handover" | "return">("handover"); const [message, setMessage] = useState("")
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); await saveInspectionReport({ bookingId, phase, checklist: [String(form.get("clean") || "")], notes: String(form.get("notes") || "") }); setMessage("Gemt"); setOpen(false) }
  return <div className="inspection-control">{open ? <form onSubmit={submit} className="inspection-form"><select value={phase} onChange={(event) => setPhase(event.target.value as "handover" | "return")}><option value="handover">Udlevering</option><option value="return">Retur</option></select><label><input type="checkbox" name="clean" value="Maskinen er kontrolleret" /> Maskinen er kontrolleret</label><textarea name="notes" placeholder="Noter fra inspektionen" rows={2} /><button className="button button-dark" type="submit">Gem inspektion</button></form> : <button className="inspection-trigger" type="button" onClick={() => setOpen(true)}>Inspektion</button>}{message && <small>{message}</small>}</div>
}
