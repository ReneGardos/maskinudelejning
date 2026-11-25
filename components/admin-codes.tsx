"use client"

import { useState } from "react"
import { saveDiscountCode } from "@/app/actions/admin"
import { useSave } from "@/components/use-save"
import { formatKr } from "@/lib/pricing"

export type CodeRow = { id: string; code: string; kind: string; value: number; minSubtotal: number; validFrom: string | null; validUntil: string | null; maxUses: number | null; usedCount: number; active: boolean; note: string | null }

const formatDate = (value: string) => value.split("-").reverse().join(".")

function codeState(row: CodeRow, today: string) {
  if (!row.active) return { label: "Slået fra", tone: "cancelled" }
  if (row.validUntil && today > row.validUntil) return { label: "Udløbet", tone: "cancelled" }
  if (row.maxUses !== null && row.usedCount >= row.maxUses) return { label: "Brugt op", tone: "cancelled" }
  if (row.validFrom && today < row.validFrom) return { label: "Planlagt", tone: "pending" }
  return { label: "Aktiv", tone: "confirmed" }
}

function CodeForm({ row, onDone }: { row?: CodeRow; onDone?: () => void }) {
  const [code, setCode] = useState(row?.code ?? "")
  const [kind, setKind] = useState(row?.kind ?? "percent")
  const [value, setValue] = useState(String(row?.value ?? ""))
  const [minSubtotal, setMinSubtotal] = useState(String(row?.minSubtotal ?? 0))
  const [validFrom, setValidFrom] = useState(row?.validFrom ?? "")
  const [validUntil, setValidUntil] = useState(row?.validUntil ?? "")
  const [maxUses, setMaxUses] = useState(row?.maxUses ? String(row.maxUses) : "")
  const [note, setNote] = useState(row?.note ?? "")
  const [active, setActive] = useState(row?.active ?? true)
  const { pending, error, saved, run } = useSave(saveDiscountCode, () => {
    if (!row) { setCode(""); setKind("percent"); setValue(""); setMinSubtotal("0"); setValidFrom(""); setValidUntil(""); setMaxUses(""); setNote(""); setActive(true) }
    onDone?.()
  })
  return (
    <form className="admin-form" onSubmit={(event) => { event.preventDefault(); void run({ id: row?.id, code, kind, value, minSubtotal, validFrom, validUntil, maxUses, note, active }) }}>
      <label>Kode<input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required minLength={3} maxLength={30} placeholder="FIRMA10" /></label>
      <div className="form-row">
        <label>Type<select value={kind} onChange={(e) => setKind(e.target.value)}><option value="percent">Procent</option><option value="amount">Kronebeløb</option></select></label>
        <label>{kind === "percent" ? "Rabat (%)" : "Rabat (kr.)"}<input type="number" min={1} max={kind === "percent" ? 100 : undefined} value={value} onChange={(e) => setValue(e.target.value)} required /></label>
      </div>
      <div className="form-row">
        <label>Gyldig fra <span className="muted">(valgfrit)</span><input type="date" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} /></label>
        <label>Gyldig til <span className="muted">(valgfrit)</span><input type="date" value={validUntil} min={validFrom || undefined} onChange={(e) => setValidUntil(e.target.value)} /></label>
      </div>
      <div className="form-row">
        <label>Mindste leje (kr.)<input type="number" min={0} value={minSubtotal} onChange={(e) => setMinSubtotal(e.target.value)} /></label>
        <label>Maks antal brug <span className="muted">(tom = ubegrænset)</span><input type="number" min={1} value={maxUses} onChange={(e) => setMaxUses(e.target.value)} /></label>
      </div>
      <label>Note <span className="muted">(kun synlig for admin)</span><input value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} /></label>
      <label className="check-row"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Aktiv</label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button className="button button-dark" disabled={pending}>{pending ? "Gemmer…" : row ? "Gem kode" : "Opret kode"}</button>{saved && <span className="muted">Gemt</span>}</div>
    </form>
  )
}

export function AdminCodes({ codes, today }: { codes: CodeRow[]; today: string }) {
  const [editing, setEditing] = useState<string | null>(null)
  return (
    <div className="admin-columns">
      <div className="admin-list">
        {codes.length === 0 && <div className="empty-state"><h2>Ingen rabatkoder endnu</h2><p className="muted">Opret den første kode i formularen.</p></div>}
        {codes.map((row) => {
          const state = codeState(row, today)
          return (
            <article className="admin-card" key={row.id}>
              <div className="admin-card-head">
                <div>
                  <strong className="code-name">{row.code}</strong> <span className={`status status-${state.tone}`}>{state.label}</span>
                  <small>{row.kind === "percent" ? `${row.value} % rabat` : `${formatKr(row.value)} rabat`}{row.minSubtotal > 0 ? ` · ved leje over ${formatKr(row.minSubtotal)}` : ""}</small>
                  <small>Brugt {row.usedCount}{row.maxUses ? ` af ${row.maxUses}` : ""} gange{row.validFrom || row.validUntil ? ` · gyldig ${row.validFrom ? `fra ${formatDate(row.validFrom)}` : ""}${row.validUntil ? ` til ${formatDate(row.validUntil)}` : ""}` : ""}</small>
                  {row.note && <small>{row.note}</small>}
                </div>
                <button type="button" className="text-link" onClick={() => setEditing(editing === row.id ? null : row.id)}>{editing === row.id ? "Luk" : "Rediger"}</button>
              </div>
              {editing === row.id && <CodeForm row={row} onDone={() => setEditing(null)} />}
            </article>
          )
        })}
      </div>
      <aside className="admin-card"><h2>Ny rabatkode</h2><CodeForm /></aside>
    </div>
  )
}
