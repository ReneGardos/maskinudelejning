import Link from "next/link"

export const metadata = { title: "Handelsbetingelser | maskinudlejning", description: "Handelsbetingelser for maskinudlejning." }

export default function TermsPage() { return <main className="legal-page"><Link href="/" className="back-link">← Forside</Link><p className="eyebrow orange">HANDELSBETINGELSER</p><h1>Handelsbetingelser</h1><div className="notice"><strong>Kræver virksomhedens juridiske gennemgang</strong><p>Denne side er en struktur til virksomhedens endelige handelsbetingelser. Udfyld udlejer, betaling, afbestilling, ansvar, forsikring, depositum og tvister før produktion.</p></div><h2>Booking og betaling</h2><p>En bookingforespørgsel er først bindende, når den er bekræftet. Priser beregnes fra det centrale prisgrundlag og viser moms separat.</p><h2>Udlevering og retur</h2><p>Maskinen skal returneres på det aftalte tidspunkt og i samme stand, bortset fra almindeligt slid. Retur og eventuelle skader registreres af admin.</p></main> }
