"use client"

import { useMemo, useState } from "react"
import { saveCustomerDiscount } from "@/app/actions/admin"
import { useSave } from "@/components/use-save"
import { formatKr } from "@/lib/pricing"

export type CustomerRow = {
  id: string; name: string; email: string; isAdmin: boolean; createdAt: string
  orders: number; revenue: number; lastOrder: string | null; phone: string | null; company: string | null
  percent: number; note: string
}

function DiscountForm({ customer, onDone }: { customer: CustomerRow; onDone: () => void }) {
  const [percent, setPercent] = useState(String(customer.percent))
  const [note, setNote] = useState(customer.note)
  const { pending, error, run } = useSave(saveCustomerDiscount, onDone)
  return (
    <form className="admin-form admin-form-inline" onSubmit={(event) => { event.preventDefault(); void run({ userId: customer.id, percent, note }) }}>
      <div className="form-row">
        <label>Fast rabat (%)<input type="number" min={0} max={100} value={percent} onChange={(e) => setPercent(e.target.value)} required /></label>
        <label>Note <span className="muted">(kun synlig for admin)</span><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Fx aftale fra 2026" /></label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button className="button button-dark" disabled={pending}>{pending ? "Gemmer…" : "Gem rabat"}</button><button type="button" className="text-link" onClick={onDone}>Annuller</button></div>
    </form>
  )
}

export function AdminCustomers({ customers }: { customers: CustomerRow[] }) {
  const [query, setQuery] = useState("")
  const [onlyDiscount, setOnlyDiscount] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return customers.filter((row) => (!onlyDiscount || row.percent > 0) && (!needle || `${row.name} ${row.email} ${row.company ?? ""} ${row.phone ?? ""}`.toLowerCase().includes(needle)))
  }, [customers, query, onlyDiscount])

  if (!customers.length) return <div className="empty-state"><h2>Ingen kunder endnu</h2><p className="muted">Kunder vises her, når de opretter en konto.</p></div>
  return (
    <>
      <div className="admin-toolbar">
        <div className="chip-row"><button type="button" className={!onlyDiscount ? "chip active" : "chip"} onClick={() => setOnlyDiscount(false)}>Alle <span className="chip-count">{customers.length}</span></button><button type="button" className={onlyDiscount ? "chip active" : "chip"} onClick={() => setOnlyDiscount(true)}>Med rabat <span className="chip-count">{customers.filter((row) => row.percent > 0).length}</span></button></div>
        <input className="admin-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Søg på navn, e-mail, firma eller telefon" aria-label="Søg i kunder" />
      </div>
      <div className="admin-table customers-table">
        <div className="table-head"><span>Kunde</span><span>Bookinger</span><span>Omsætning</span><span>Rabat</span></div>
        {visible.length === 0 && <div className="table-row"><span className="muted">Ingen kunder matcher.</span></div>}
        {visible.map((row) => (
          <div className="table-row" key={row.id}>
            <div><strong>{row.name}{row.isAdmin && <span className="admin-badge"> · admin</span>}</strong><small>{row.company ? `${row.company} · ` : ""}{row.email}{row.phone ? ` · ${row.phone}` : ""}</small><small>Oprettet {new Date(row.createdAt).toLocaleDateString("da-DK")}</small></div>
            <div><span>{row.orders}</span>{row.lastOrder && <small>Seneste {new Date(row.lastOrder).toLocaleDateString("da-DK")}</small>}</div>
            <div><span>{formatKr(row.revenue)}</span></div>
            <div className="admin-status-actions">
              {row.percent > 0 ? <span className="status status-confirmed">{row.percent} %</span> : <span className="muted">Ingen</span>}
              {row.note && <small>{row.note}</small>}
              <button type="button" className="text-link" onClick={() => setEditing(editing === row.id ? null : row.id)}>{editing === row.id ? "Luk" : "Ret rabat"}</button>
            </div>
            {editing === row.id && <div className="order-detail"><DiscountForm customer={row} onDone={() => setEditing(null)} /></div>}
          </div>
        ))}
      </div>
    </>
  )
}
