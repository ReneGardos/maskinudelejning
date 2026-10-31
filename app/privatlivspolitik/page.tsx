import Link from "next/link"

export const metadata = { title: "Privatlivspolitik | maskinudlejning", description: "Privatlivspolitik for maskinudlejning." }

export default function PrivacyPage() { return <main className="legal-page"><Link href="/" className="back-link">← Forside</Link><p className="eyebrow orange">PRIVATLIV</p><h1>Privatlivspolitik</h1><div className="notice"><strong>Kræver virksomhedens juridiske gennemgang</strong><p>Den dataansvarliges juridiske navn, kontaktoplysninger, opbevaringsperioder, databehandlere og registreredes rettigheder skal udfyldes før produktion.</p></div><h2>Data i tjenesten</h2><p>Systemet behandler konto-, kontakt- og bookingdata for at håndtere udlejning. Data er adskilt pr. bruger, og admin-adgang er beskyttet.</p><h2>Betaling og filer</h2><p>Betaling håndteres af Stripe, og inspektionsfiler opbevares i privat Blob storage. De endelige databehandleroplysninger skal godkendes af virksomheden.</p></main> }
