"use client"

import { useMemo, useState } from "react"
import { updateOrderStatus } from "@/app/actions/bookings"
import type { BookingStatus } from "@/lib/booking-rules"
import { formatKr, formatOrderNumber } from "@/lib/pricing"

export type AdminOrder = {
  id: string; orderNumber: number | null; createdAt: string; status: string
  customerName: string; customerEmail: string; customerPhone: string; company: string | null; notes: string | null
  deliveryType: string; deliveryAddress: string | null; deliveryPostalCode: string | null
  deliveryFee: number; subtotal: number; discountAmount: number; discountLabel: string | null; total: number; deposit: number
  lines: Array<{ id: string; machineName: string; startDate: string; endDate: string; total: number; items: Array<{ name: string; quantity: number }> }>
}

const statusLabel = (status: string) => status === "pending" ? "Afventer" : status === "confirmed" ? "Bekræftet" : "Annulleret"
const filters = [{ value: "all", label: "Alle" }, { value: "pending", label: "Afventer" }, { value: "confirmed", label: "Bekræftet" }, { value: "cancelled", label: "Annulleret" }]
const formatDate = (value: string) => value.split("-").reverse().join(".")

export function AdminBookings({ orders }: { orders: AdminOrder[] }) {
  const [items, setItems] = useState(orders)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState("pending")
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return items.filter((item) => (filter === "all" || item.status === filter) && (!needle || [formatOrderNumber(item.orderNumber), item.customerName, item.customerEmail, item.customerPhone, item.company ?? "", ...item.lines.map((line) => line.machineName)].join(" ").toLowerCase().includes(needle)))
  }, [items, filter, query])

  async function changeStatus(id: string, status: BookingStatus) {
    setError(""); setBusy(id)
    try {
      const result = await updateOrderStatus(id, status)
      if (!result.ok) { setError(result.error); return }
      setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item))
    } catch {
      setError("Der opstod en fejl. Prøv igen.")
    } finally {
      setBusy(null)
    }
  }

  if (!items.length) return <div className="empty-state"><h2>Ingen bookinger endnu</h2><p className="muted">Nye bookinger vises her.</p></div>
  return (
    <>
      <div className="admin-toolbar">
        <div className="chip-row" role="group" aria-label="Filtrer på status">
          {filters.map((option) => <button type="button" key={option.value} className={filter === option.value ? "chip active" : "chip"} onClick={() => setFilter(option.value)}>{option.label} <span className="chip-count">{option.value === "all" ? items.length : items.filter((item) => item.status === option.value).length}</span></button>)}
        </div>
        <input className="admin-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Søg på bookingnr., kunde, firma eller maskine" aria-label="Søg i bookinger" />
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="admin-table orders-table">
        <div className="table-head"><span>Booking</span><span>Kunde</span><span>Maskiner</span><span>Beløb</span><span>Status</span></div>
        {visible.length === 0 && <div className="table-row"><span className="muted">Ingen bookinger matcher.</span></div>}
        {visible.map((item) => {
          const first = item.lines.reduce((min, line) => line.startDate < min ? line.startDate : min, item.lines[0]?.startDate ?? "")
          const last = item.lines.reduce((max, line) => line.endDate > max ? line.endDate : max, item.lines[0]?.endDate ?? "")
          const expanded = open === item.id
          return (
            <div className={`table-row order-row${expanded ? " expanded" : ""}`} key={item.id}>
              <button type="button" className="order-toggle" onClick={() => setOpen(expanded ? null : item.id)} aria-expanded={expanded}>
                <strong>{formatOrderNumber(item.orderNumber)}</strong><small>{first && `${formatDate(first)} – ${formatDate(last)}`}</small>
              </button>
              <div><strong>{item.customerName}</strong><small>{item.company ? `${item.company} · ` : ""}{item.customerPhone}</small></div>
              <div><span>{item.lines.length} {item.lines.length === 1 ? "maskine" : "maskiner"}</span><small>{item.lines.map((line) => line.machineName).join(", ")}</small></div>
              <div><strong>{formatKr(item.total)}</strong>{item.discountAmount > 0 && <small>Rabat −{formatKr(item.discountAmount)}</small>}</div>
              <div className="admin-status-actions">
                <span className={`status status-${item.status}`}>{statusLabel(item.status)}</span>
                {item.status === "pending" && <button type="button" className="button button-dark button-small" disabled={busy === item.id} onClick={() => changeStatus(item.id, "confirmed")}>Bekræft</button>}
                <select value={item.status} disabled={busy === item.id} onChange={(event) => changeStatus(item.id, event.target.value as BookingStatus)} aria-label={`Status for ${formatOrderNumber(item.orderNumber)}`}>
                  <option value="pending">Afventer</option><option value="confirmed">Bekræftet</option><option value="cancelled">Annulleret</option>
                </select>
              </div>
              {expanded && (
                <div className="order-detail">
                  <div className="order-detail-grid">
                    <div>
                      <span className="order-sub">Maskiner</span>
                      <ul className="order-card-lines">
                        {item.lines.map((line) => (
                          <li key={line.id}><div><strong>{line.machineName}</strong><small>{formatDate(line.startDate)} – {formatDate(line.endDate)}{line.items.length ? ` · ${line.items.map((row) => `${row.quantity} × ${row.name}`).join(", ")}` : ""}</small></div><span>{formatKr(line.total)}</span></li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="order-sub">Kunde</span>
                      <p>{item.customerName}{item.company ? `, ${item.company}` : ""}<br /><a href={`mailto:${item.customerEmail}`}>{item.customerEmail}</a><br /><a href={`tel:${item.customerPhone.replace(/\s/g, "")}`}>{item.customerPhone}</a></p>
                      <span className="order-sub">Levering</span>
                      <p>{item.deliveryType === "delivery" ? `${item.deliveryAddress}, ${item.deliveryPostalCode}` : "Afhentning"}</p>
                      {item.notes && <><span className="order-sub">Besked</span><p>{item.notes}</p></>}
                    </div>
                    <div className="order-detail-sum">
                      <div className="summary-row"><span>Leje</span><span>{formatKr(item.subtotal)}</span></div>
                      {item.deliveryFee > 0 && <div className="summary-row"><span>Levering</span><span>{formatKr(item.deliveryFee)}</span></div>}
                      {item.discountAmount > 0 && <div className="summary-row discount"><span>Rabat<small>{item.discountLabel}</small></span><span>−{formatKr(item.discountAmount)}</span></div>}
                      <div className="summary-row summary-total"><span>I alt</span><span>{formatKr(item.total)}</span></div>
                      {item.deposit > 0 && <div className="summary-row summary-deposit"><span>Depositum</span><span>{formatKr(item.deposit)}</span></div>}
                      <small className="muted">Modtaget {new Date(item.createdAt).toLocaleString("da-DK")}</small>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
