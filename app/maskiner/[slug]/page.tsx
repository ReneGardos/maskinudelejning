'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowRight, CalendarDays, Check, CircleCheck, Clock3, ShieldCheck, Truck } from 'lucide-react'
import { useState } from 'react'

export default function MachineDetailPage() {
  const [booked, setBooked] = useState(false)
  return (
    <main className="site-shell">
      <header className="navbar"><div className="container nav-inner"><Link href="/" className="brand"><span className="brand-mark">M</span><span>maskin<span>udlejning</span><small>MASKINER TIL DINE PROJEKTER</small></span></Link><nav className="nav-links"><Link href="/maskiner">Maskiner</Link><Link href="/#projekter">Find din maskine</Link><Link href="/#saadan">Sådan fungerer det</Link></nav><Link href="/#booking" className="button button-dark">Book en maskine <ArrowRight size={16} /></Link></div></header>
      <section className="detail-page"><div className="container"><Link href="/maskiner" className="back-link"><ArrowLeft size={15}/> Tilbage til kataloget</Link><div className="detail-grid"><div className="detail-visual"><img src="/maskiner-hero.png" alt="90 kg pladevibrator" /><span className="machine-tag">Mest lejet</span></div><div className="detail-copy"><p className="eyebrow orange">KOMPRIMERING</p><h1>90 kg pladevibrator</h1><p className="detail-lede">En driftssikker pladevibrator til komprimering af jord, grus og belægning. Et godt valg til terrasser, indkørsler og mindre anlægsopgaver.</p><div className="detail-price"><strong>395 kr.</strong><span>pr. dag ekskl. moms</span></div><div className="detail-spec-grid"><span><strong>90 kg</strong> Arbejdsvægt</span><span><strong>Benzin</strong> Drivmiddel</span><span><strong>45 cm</strong> Pladebredde</span><span><strong>25 m²/t</strong> Kapacitet</span></div><div className="detail-booking"><label>Vælg lejeperiode<input type="date" aria-label="Startdato" /></label><label><span aria-hidden="true">&nbsp;</span><input type="date" aria-label="Slutdato" /></label><button className="button button-orange" onClick={() => setBooked(true)}>{booked ? <><CircleCheck size={16}/> Lagt i booking</> : <>Fortsæt til booking <ArrowRight size={16}/></>}</button></div>{booked && <div className="booking-success"><CircleCheck size={17}/> Maskinen er lagt i din booking. <Link href="/#booking">Se booking</Link></div>}</div></div></div></section>
      <section className="detail-benefits"><div className="container benefits-grid"><div><ShieldCheck size={20}/><strong>Kontrolleret før hver leje</strong><span>Vi gennemgår maskinen sammen med dig.</span></div><div><Truck size={20}/><strong>Levering i Midtjylland</strong><span>Få den leveret direkte til byggepladsen.</span></div><div><Clock3 size={20}/><strong>Fleksibel afhentning</strong><span>Afhent også uden for åbningstid efter aftale.</span></div></div></section>
      <section className="section detail-info"><div className="container detail-info-grid"><div><p className="eyebrow">DET FÅR DU MED</p><h2>Alt du skal bruge for at komme i gang</h2></div><ul><li><Check size={17}/> Brugsvejledning og sikkerhedsgennemgang</li><li><Check size={17}/> Fuld tank ved afhentning</li><li><Check size={17}/> Kundeservice alle hverdage</li><li><Check size={17}/> Mulighed for levering og afhentning</li></ul></div></section>
    </main>
  )
}
