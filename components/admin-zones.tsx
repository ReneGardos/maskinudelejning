"use client"

import { useState } from "react"
import { saveZone } from "@/app/actions/admin"
import { useSave } from "@/components/use-save"

export type ZoneRow = { id: string; name: string; postalCodes: string; deliveryFee: number; collectionFee: number; active: boolean }

function ZoneForm({ zone, onDone }: { zone?: ZoneRow; onDone?: () => void }) {
  const [name, setName] = useState(zone?.name ?? "")
  const [postalCodes, setPostalCodes] = useState(zone?.postalCodes ?? "")
  const [deliveryFee, setDeliveryFee] = useState(String(zone?.deliveryFee ?? 0))
  const [collectionFee, setCollectionFee] = useState(String(zone?.collectionFee ?? 0))
  const [active, setActive] = useState(zone?.active ?? true)
  const { pending, error, saved, run } = useSave(saveZone, () => {
    if (!zone) { setName(""); setPostalCodes(""); setDeliveryFee("0"); setCollectionFee("0"); setActive(true) }
    onDone?.()
  })

  return (
    <form className="admin-form" onSubmit={(event) => { event.preventDefault(); void run({ id: zone?.id, name, postalCodes, deliveryFee, collectionFee, active }) }}>
      <label>Navn<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} /></label>
      <label>Postnumre (adskilt med komma, eller * for øvrige)<input value={postalCodes} onChange={(e) => setPostalCodes(e.target.value)} required placeholder="7400, 7401, 7410" /></label>
      <div className="form-row">
        <label>Levering (kr.)<input type="number" min={0} value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} required /></label>
        <label>Afhentning hos kunden (kr.)<input type="number" min={0} value={collectionFee} onChange={(e) => setCollectionFee(e.target.value)} required /></label>
      </div>
      <label className="check-row"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Aktiv</label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button className="button button-dark" disabled={pending}>{pending ? "Gemmer…" : zone ? "Gem zone" : "Opret zone"}</button>{saved && <span className="muted">Gemt</span>}</div>
    </form>
  )
}

export function AdminZones({ zones }: { zones: ZoneRow[] }) {
  const [editing, setEditing] = useState<string | null>(null)
  return (
    <div className="admin-columns">
      <div className="admin-list">
        {zones.length === 0 && <div className="empty-state"><h2>Ingen zoner endnu</h2><p className="muted">Uden zoner kan kunder ikke vælge levering.</p></div>}
        {zones.map((zone) => (
          <article className="admin-card" key={zone.id}>
            <div className="admin-card-head"><div><strong>{zone.name}</strong>{!zone.active && <span className="status status-cancelled"> Inaktiv</span>}<small>Levering {zone.deliveryFee} kr. · Afhentning {zone.collectionFee} kr. ekskl. moms</small></div>
              <button type="button" className="text-link" onClick={() => setEditing(editing === zone.id ? null : zone.id)}>{editing === zone.id ? "Luk" : "Rediger"}</button></div>
            <p className="muted postal-list">{zone.postalCodes.split(",").join(", ")}</p>
            {editing === zone.id && <ZoneForm zone={zone} onDone={() => setEditing(null)} />}
          </article>
        ))}
      </div>
      <aside className="admin-card"><h2>Ny leveringszone</h2><ZoneForm /></aside>
    </div>
  )
}
