import Link from "next/link"
import { company } from "@/lib/company"

export const metadata = { title: "Handelsbetingelser" }

export default function TermsPage() {
  return (
    <main className="legal-page">
      <Link href="/" className="brand">maskin<span>udlejning</span></Link>
      <h1>Handelsbetingelser</h1>
      <p className="muted">Gælder for udlejning fra {company.legalName}, CVR {company.cvr}, {company.address}.</p>
      <div className="legal-note"><strong>Udkast:</strong> Disse betingelser er en skabelon og skal gennemgås af en jurist og tilpasses jeres forretning, før de bruges i drift.</div>

      <h2>1. Booking</h2>
      <p>En booking på sitet er en forespørgsel. Lejeaftalen er først indgået, når vi har bekræftet bookingen på e-mail eller i din konto. Vi kan afvise en booking, fx hvis maskinen ikke er tilgængelig.</p>
      <h2>2. Priser</h2>
      <p>Alle priser er i danske kroner ekskl. moms. Lejeperioden regnes i hele kalenderdage, begge datoer inkluderet. Prisen for tilbehør og eventuelt leveringsgebyr vises i tilbuddet, før du sender forespørgslen.</p>
      <h2>3. Depositum</h2>
      <p>Der kan kræves depositum for maskine og tilbehør. Depositum er ikke en del af lejeprisen og opkræves separat. Det tilbagebetales, når materiellet er afleveret i samme stand som ved udleveringen, minus eventuelle krav for skader eller manglende rengøring.</p>
      <h2>4. Levering og afhentning</h2>
      <p>Du kan hente materiellet hos os eller få det leveret mod gebyr efter vores leveringszoner. Leveringsadressen skal være tilgængelig for en lastbil eller trailer. Du skal være til stede ved levering og afhentning, eller aftale andet med os.</p>
      <h2>5. Afbestilling</h2>
      <p>Du kan afbestille en booking i din konto til og med dagen før, lejeperioden starter. Senere afbestilling sker ved at kontakte os, og vi kan opkræve [vilkår for sen afbestilling].</p>
      <h2>6. Brug og ansvar</h2>
      <p>Materiellet skal bruges forsvarligt og efter vejledning. Du hæfter for skader, tab og tyveri i lejeperioden, medmindre skaden skyldes almindelig slitage. Du må ikke fremleje materiellet.</p>
      <h2>7. Aflevering</h2>
      <p>Materiellet skal afleveres rengjort og senest sidste dag i lejeperioden. Ved for sen aflevering opkræves leje for de ekstra dage.</p>
      <h2>8. Fortrydelsesret</h2>
      <p>[Beskriv jeres vilkår for fortrydelsesret. Udlejning af maskiner til en bestemt periode er normalt undtaget fra 14 dages fortrydelsesret, men det skal vurderes og formuleres korrekt.]</p>
      <h2>9. Reklamation og tvister</h2>
      <p>Mangler skal meldes til os hurtigst muligt. Aftalen er underlagt dansk ret. Forbrugere kan klage til Konkurrence- og Forbrugerstyrelsen eller via EU-Kommissionens klageportal.</p>
      <h2>Kontakt</h2>
      <p>{company.legalName} · {company.address} · {company.phone} · {company.email}</p>
    </main>
  )
}
