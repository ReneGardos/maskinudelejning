"use client"

import { useState } from "react"
import { updateBookingStatus } from "@/app/actions/bookings"

export function AdminBookings({ bookings }: { bookings: Array<{ id: string; customerName: string; customerEmail: string; machineName: string; startDate: string; endDate: string; status: string }> }) {
  const [items, setItems] = useState(bookings)
  async function changeStatus(id: string, status: "pending" | "confirmed" | "cancelled") { await updateBookingStatus(id, status); setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item)) }
  if (!items.length) return <div className="empty-state"><h2>Ingen bookinger endnu</h2><p className="muted">Nye forespørgsler vises her.</p></div>
  return <div className="admin-table"><div className="table-head"><span>Kunde</span><span>Maskine</span><span>Periode</span><span>Status</span></div>{items.map((item) => <div className="table-row" key={item.id}><div><strong>{item.customerName}</strong><small>{item.customerEmail}</small></div><span>{item.machineName}</span><span>{item.startDate} → {item.endDate}</span><div className="admin-status-actions"><span className={`status status-${item.status}`}>{item.status === "pending" ? "Afventer" : item.status === "confirmed" ? "Bekræftet" : "Annulleret"}</span><select value={item.status} onChange={(event) => changeStatus(item.id, event.target.value as "pending" | "confirmed" | "cancelled")} aria-label={`Status for ${item.customerName}`}><option value="pending">Afventer</option><option value="confirmed">Bekræft</option><option value="cancelled">Annuller</option></select></div></div>)}</div>
}
