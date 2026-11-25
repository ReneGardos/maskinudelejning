import Link from "next/link"
import { company } from "@/lib/company"

export const metadata = { title: "Privatlivspolitik", description: "Sådan behandler vi dine personoplysninger, når du opretter en konto og booker maskiner.", alternates: { canonical: "/privatlivspolitik" } }

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <Link href="/" className="brand">maskin<span>udlejning</span></Link>
      <h1>Privatlivspolitik</h1>
      <div className="legal-note"><strong>Udkast:</strong> Denne politik er en skabelon og skal gennemgås af en jurist og tilpasses, før den bruges i drift.</div>

      <h2>Hvem er ansvarlig?</h2>
      <p>{company.legalName}, CVR {company.cvr}, {company.address}. Du kan kontakte os på {company.email} eller {company.phone}.</p>
      <h2>Hvilke oplysninger behandler vi?</h2>
      <ul>
        <li>Kontooplysninger: navn, e-mail og adgangskode (gemmes krypteret som hash).</li>
        <li>Bookingoplysninger: telefonnummer, ønsket maskine og periode, leveringsadresse og dine bemærkninger.</li>
        <li>Tekniske oplysninger: en session-cookie, der holder dig logget ind.</li>
      </ul>
      <h2>Hvorfor og på hvilket grundlag?</h2>
      <p>Vi bruger oplysningerne til at oprette din konto, behandle og levere din booking og kontakte dig om den (GDPR art. 6, stk. 1, litra b). Vi gemmer bogføringsmateriale i det antal år, bogføringsloven kræver (litra c).</p>
      <h2>Hvem deler vi data med?</h2>
      <p>Vi bruger databehandlere til hosting (Vercel), database (Neon) og udsendelse af e-mails (Resend). [Tilføj betalingsudbyder m.fl., hvis relevant.] Vi sælger ikke dine oplysninger.</p>
      <h2>Hvor længe gemmer vi dem?</h2>
      <p>Kontooplysninger gemmes, til du beder os slette din konto. Bookinger gemmes, så længe det er nødvendigt for regnskab og eventuelle krav, [angiv periode].</p>
      <h2>Dine rettigheder</h2>
      <p>Du har ret til indsigt, berigtigelse, sletning, begrænsning, dataportabilitet og til at gøre indsigelse. Skriv til {company.email}. Du kan klage til Datatilsynet (datatilsynet.dk).</p>
      <h2>Cookies</h2>
      <p>Sitet bruger kun den nødvendige session-cookie til login. Vi bruger ikke marketing- eller statistikcookies.</p>
    </main>
  )
}
