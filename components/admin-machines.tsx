"use client"

import { useState } from "react"
import { saveAccessory, saveMachine } from "@/app/actions/admin"
import { useSave } from "@/components/use-save"

export type AccessoryRow = { id: string; name: string; description: string | null; dailyPrice: number; deposit: number; active: boolean }
export type MachineRow = {
  id: string; slug: string; name: string; category: string; description: string; dailyPrice: number; deposit: number
  image: string; manufacturer: string; model: string | null; specifications: Record<string, string>; active: boolean; deliveryAvailable: boolean
  accessories: AccessoryRow[]
}

const specsToText = (specs: Record<string, string>) => Object.entries(specs).map(([key, value]) => `${key}: ${value}`).join("\n")
const slugify = (value: string) => value.toLowerCase().replace(/æ/g, "ae").replace(/ø/g, "oe").replace(/å/g, "aa").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

function AccessoryForm({ machineId, accessory, onDone }: { machineId: string; accessory?: AccessoryRow; onDone?: () => void }) {
  const [name, setName] = useState(accessory?.name ?? "")
  const [description, setDescription] = useState(accessory?.description ?? "")
  const [dailyPrice, setDailyPrice] = useState(String(accessory?.dailyPrice ?? 0))
  const [deposit, setDeposit] = useState(String(accessory?.deposit ?? 0))
  const [active, setActive] = useState(accessory?.active ?? true)
  const { pending, error, saved, run } = useSave(saveAccessory, () => {
    if (!accessory) { setName(""); setDescription(""); setDailyPrice("0"); setDeposit("0"); setActive(true) }
    onDone?.()
  })
  return (
    <form className="admin-form admin-form-inline" onSubmit={(event) => { event.preventDefault(); void run({ id: accessory?.id, machineId, name, description, dailyPrice, deposit, active }) }}>
      <label>Navn<input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} /></label>
      <label>Beskrivelse<input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} /></label>
      <div className="form-row">
        <label>Pris pr. dag (kr.)<input type="number" min={0} value={dailyPrice} onChange={(e) => setDailyPrice(e.target.value)} required /></label>
        <label>Depositum (kr.)<input type="number" min={0} value={deposit} onChange={(e) => setDeposit(e.target.value)} required /></label>
      </div>
      <label className="check-row"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Aktiv</label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button className="button button-dark" disabled={pending}>{pending ? "Gemmer…" : accessory ? "Gem tilbehør" : "Tilføj tilbehør"}</button>{saved && <span className="muted">Gemt</span>}</div>
    </form>
  )
}

function MachineForm({ machine, onDone }: { machine?: MachineRow; onDone?: () => void }) {
  const [name, setName] = useState(machine?.name ?? "")
  const [slug, setSlug] = useState(machine?.slug ?? "")
  const [slugTouched, setSlugTouched] = useState(false)
  const [category, setCategory] = useState(machine?.category ?? "")
  const [description, setDescription] = useState(machine?.description ?? "")
  const [dailyPrice, setDailyPrice] = useState(String(machine?.dailyPrice ?? ""))
  const [deposit, setDeposit] = useState(String(machine?.deposit ?? 0))
  const [image, setImage] = useState(machine?.image ?? "")
  const [manufacturer, setManufacturer] = useState(machine?.manufacturer ?? "")
  const [model, setModel] = useState(machine?.model ?? "")
  const [specifications, setSpecifications] = useState(machine ? specsToText(machine.specifications) : "")
  const [active, setActive] = useState(machine?.active ?? true)
  const [deliveryAvailable, setDeliveryAvailable] = useState(machine?.deliveryAvailable ?? true)
  const { pending, error, saved, run } = useSave(saveMachine, () => {
    if (!machine) { setName(""); setSlug(""); setSlugTouched(false); setCategory(""); setDescription(""); setDailyPrice(""); setDeposit("0"); setImage(""); setManufacturer(""); setModel(""); setSpecifications(""); setActive(true); setDeliveryAvailable(true) }
    onDone?.()
  })

  return (
    <form className="admin-form" onSubmit={(event) => { event.preventDefault(); void run({ id: machine?.id, slug, name, category, description, dailyPrice, deposit, image, manufacturer, model, specifications, active, deliveryAvailable }) }}>
      <label>Navn<input value={name} onChange={(e) => { setName(e.target.value); if (!machine && !slugTouched) setSlug(slugify(e.target.value)) }} required maxLength={100} /></label>
      <label>Adresse (slug){machine ? " – kan ikke ændres" : ""}<input value={slug} onChange={(e) => { setSlug(e.target.value); setSlugTouched(true) }} required disabled={Boolean(machine)} placeholder="fx 1-5t-minigraver" /></label>
      <div className="form-row">
        <label>Kategori<input value={category} onChange={(e) => setCategory(e.target.value)} required maxLength={60} /></label>
        <label>Producent<input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} maxLength={100} /></label>
        <label>Model<input value={model} onChange={(e) => setModel(e.target.value)} maxLength={100} /></label>
      </div>
      <label>Beskrivelse<textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={3} maxLength={1000} /></label>
      <div className="form-row">
        <label>Dagspris (kr. ekskl. moms)<input type="number" min={1} value={dailyPrice} onChange={(e) => setDailyPrice(e.target.value)} required /></label>
        <label>Depositum (kr.)<input type="number" min={0} value={deposit} onChange={(e) => setDeposit(e.target.value)} required /></label>
      </div>
      <label>Billede (sti som /maskine.png eller https-adresse)<input value={image} onChange={(e) => setImage(e.target.value)} required /></label>
      <label>Specifikationer (én pr. linje: “Motor: Diesel”)<textarea value={specifications} onChange={(e) => setSpecifications(e.target.value)} rows={4} /></label>
      <div className="form-row">
        <label className="check-row"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Vises i kataloget</label>
        <label className="check-row"><input type="checkbox" checked={deliveryAvailable} onChange={(e) => setDeliveryAvailable(e.target.checked)} /> Kan leveres</label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button className="button button-dark" disabled={pending}>{pending ? "Gemmer…" : machine ? "Gem maskine" : "Opret maskine"}</button>{saved && <span className="muted">Gemt</span>}</div>
    </form>
  )
}

export function AdminMachines({ machines }: { machines: MachineRow[] }) {
  const [editing, setEditing] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [editingAccessory, setEditingAccessory] = useState<string | null>(null)

  return (
    <div className="admin-list">
      <div className="admin-toolbar"><button type="button" className="button button-dark" onClick={() => setAdding(!adding)}>{adding ? "Luk" : "Ny maskine"}</button></div>
      {adding && <article className="admin-card"><h2>Ny maskine</h2><MachineForm onDone={() => setAdding(false)} /></article>}
      {machines.length === 0 && !adding && <div className="empty-state"><h2>Ingen maskiner</h2><p className="muted">Opret den første maskine.</p></div>}
      {machines.map((machine) => (
        <article className="admin-card" key={machine.id}>
          <div className="admin-card-head">
            <div><strong>{machine.name}</strong>{!machine.active && <span className="status status-cancelled"> Skjult</span>}<small>{machine.category} · {machine.dailyPrice} kr./dag · depositum {machine.deposit} kr. · /maskiner/{machine.slug}</small></div>
            <button type="button" className="text-link" onClick={() => setEditing(editing === machine.id ? null : machine.id)}>{editing === machine.id ? "Luk" : "Rediger"}</button>
          </div>
          {editing === machine.id && (
            <>
              <MachineForm machine={machine} onDone={() => setEditing(null)} />
              <h3>Tilbehør</h3>
              {machine.accessories.length === 0 && <p className="muted">Intet tilbehør endnu.</p>}
              {machine.accessories.map((item) => (
                <div className="accessory-row" key={item.id}>
                  <div><strong>{item.name}</strong>{!item.active && <span className="status status-cancelled"> Inaktiv</span>}<small>{item.dailyPrice} kr./dag · depositum {item.deposit} kr.</small></div>
                  <button type="button" className="text-link" onClick={() => setEditingAccessory(editingAccessory === item.id ? null : item.id)}>{editingAccessory === item.id ? "Luk" : "Rediger"}</button>
                  {editingAccessory === item.id && <AccessoryForm machineId={machine.id} accessory={item} onDone={() => setEditingAccessory(null)} />}
                </div>
              ))}
              <details className="accessory-new"><summary>Tilføj tilbehør</summary><AccessoryForm machineId={machine.id} /></details>
            </>
          )}
        </article>
      ))}
    </div>
  )
}
