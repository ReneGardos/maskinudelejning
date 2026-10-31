import Link from "next/link"

export const metadata = { title: "Om os | maskinudlejning", description: "Læs om maskinudlejning og vores lokale udlejning." }

export default function AboutPage() { return <main className="legal-page"><Link href="/" className="back-link">← Forside</Link><p className="eyebrow orange">OM OS</p><h1>Ordentligt materiel. Ordentlig service.</h1><p className="lead">maskinudlejning gør det enkelt at finde, booke og hente det rigtige materiel til dit projekt.</p><div className="notice"><strong>Virksomhedsoplysninger mangler</strong><p>Virksomhedens juridiske navn, adresse, CVR-nummer, telefon og email skal udfyldes i admin-indstillinger før produktion.</p></div><h2>Sådan arbejder vi</h2><p>Vi viser kun maskiner, der er registreret i det centrale inventar, med tydelige priser og praktiske specifikationer.</p></main> }
