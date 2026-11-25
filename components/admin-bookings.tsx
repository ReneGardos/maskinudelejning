"use client"

import { useMemo, useState } from "react"
import { updateBookingStatus } from "@/app/actions/bookings"
import type { BookingStatus } from "@/lib/booking-rules"
import { formatKr } from "@/lib/pricing"

type Item = {
  id: string; customerName: string; customerEmail: string; customerPhone: string; notes: string | null
  deliveryType: string; deliveryAddress: string | null; deliveryPostalCode: string | null; deliveryFee: number; deposit: number
  machineName: string; startDate: string; endDate: string; total: number; status: string
  items: Array<{ name: string; quantity: number }>
}

const statusLabel = (status: string) => status === "pending" ? "Afventer" : status === "confirmed" ? "Bekræftet" : "Annulleret"
const filters = [{ value: "all", label: "Alle" }, { value: "pending", label: "Afventer" }, { value: "confirmed", label: "Bekræftet" }, { value: "cancelled", label: "Annulleret" }]

export function AdminBookings({ bookings }: { bookings: Item[] }) {
  const [items, setItems] = useState(bookings)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState("all")
  const [query, setQuery] = useState("")

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items.filter((item) => (filter === "all" || item.status === filter) && (!needle || `${item.customerName} ${item.customerEmail} ${item.customerPhone} ${item.machineName}`.toLowerCase().includes(needle)))
  }, [items, filter, query])

  async function changeStatus(id: string, status: BookingStatus) {
    setError("")
    const result = await updateBookingStatus(id, status)
    if (!result.ok) { setError(result.error); return }
    setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item))
  }

  if (!items.length) return <div className="empty-state"><h2>Ingen bookinger endnu</h2><p className="muted">Nye forespørgsler vises her.</p></div>
  return (
    <>
      <div className="admin-toolbar">
        <div className="chip-row" role="group" aria-label="Filtrer på status">
          {filters.map((option) => <button type="button" key={option.value} className={filter === option.value ? "chip active" : "chip"} onClick={() => setFilter(option.value)}>{option.label}</button>)}
        </div>
        <input className="admin-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Søg på navn, mail, telefon eller maskine" aria-label="Søg i bookinger" />
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="admin-table">
        <div className="table-head"><span>Kunde</span><span>Maskine</span><span>Periode</span><span>Status</span></div>
        {visible.length === 0 && <div className="table-row"><span className="muted">Ingen bookinger matcher.</span></div>}
        {visible.map((item) => (
          <div className="table-row" key={item.id}>
            <div><strong>{item.customerName}</strong><small>{item.customerEmail} · {item.customerPhone}</small>{item.notes && <small>“{item.notes}”</small>}</div>
            <span>
              {item.machineName}
              {item.items.map((row) => <small key={row.name}>+ {row.quantity} × {row.name}</small>)}
              <small>{formatKr(item.total)} ekskl. moms{item.deposit > 0 ? ` · depositum ${formatKr(item.deposit)}` : ""}</small>
              <small>{item.deliveryType === "delivery" ? `Levering: ${item.deliveryAddress}, ${item.deliveryPostalCode}${item.deliveryFee > 0 ? ` (${formatKr(item.deliveryFee)})` : ""}` : "Afhentning"}</small>
            </span>
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
