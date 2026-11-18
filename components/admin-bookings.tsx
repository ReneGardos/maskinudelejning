"use client"

import { useState } from "react"
import { updateBookingStatus } from "@/app/actions/bookings"
import type { BookingStatus } from "@/lib/booking-rules"

type Item = { id: string; customerName: string; customerEmail: string; customerPhone: string; notes: string | null; deliveryMethod: string; deliveryAddress: string | null; deliveryPostcode: string | null; machineName: string; startDate: string; endDate: string; total: number; status: string }

const statusLabel = (status: string) => status === "pending" ? "Afventer" : status === "confirmed" ? "Bekræftet" : "Annulleret"

export function AdminBookings({ bookings }: { bookings: Item[] }) {
  const [items, setItems] = useState(bookings)
  const [error, setError] = useState("")

  async function changeStatus(id: string, status: BookingStatus) {
    setError("")
    const result = await updateBookingStatus(id, status)
    if (!result.ok) { setError(result.error); return }
    setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item))
  }

  if (!items.length) return <div className="empty-state"><h2>Ingen bookinger endnu</h2><p className="muted">Nye forespørgsler vises her.</p></div>
  return (
    <>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="admin-table">
        <div className="table-head"><span>Kunde</span><span>Maskine</span><span>Periode</span><span>Status</span></div>
        {items.map((item) => (
          <div className="table-row" key={item.id}>
            <div><strong>{item.customerName}</strong><small>{item.customerEmail} · {item.customerPhone}</small>{item.notes && <small>“{item.notes}”</small>}</div>
            <span>{item.machineName}<small>{item.total.toLocaleString("da-DK")} kr. ekskl. moms</small><small>{item.deliveryMethod === "delivery" ? `Levering: ${item.deliveryAddress}, ${item.deliveryPostcode}` : "Afhentning"}</small></span>
            <span>{item.startDate} → {item.endDate}</span>
            <div className="admin-status-actions">
              <span className={`status status-${item.status}`}>{statusLabel(item.status)}</span>
              <select value={item.status} onChange={(event) => changeStatus(item.id, event.target.value as BookingStatus)} aria-label={`Status for ${item.customerName}`}>
                <option value="pending">Afventer</option><option value="confirmed">Bekræft</option><option value="cancelled">Annuller</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
