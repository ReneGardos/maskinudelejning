"use client"

import { useState } from "react"
import { toggleFavoriteMachine } from "@/app/actions/bookings"

export function FavoriteMachine({ machineId }: { machineId: string }) { const [saved, setSaved] = useState(false); const [message, setMessage] = useState(""); async function toggle() { try { const result = await toggleFavoriteMachine(machineId); setSaved(result.saved); setMessage(result.saved ? "Gemt" : "Fjernet") } catch { setMessage("Log ind for at gemme") } } return <button type="button" className="favorite-button" onClick={toggle}>{saved ? "Gemt" : "Gem maskine"}{message && <small>{message}</small>}</button> }
