import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'maskinudlejning | Lej maskiner til dit projekt',
  description: 'Professionel maskinudlejning i Midtjylland. Find, book og få leveret det rigtige materiel til dit projekt.',
  generator: 'v0.app',
  openGraph: { title: 'maskinudlejning | Maskiner til dine projekter', description: 'Enkel booking af professionelt materiel i Midtjylland.', type: 'website' },
}

export const viewport: Viewport = { colorScheme: 'light', themeColor: '#171a1b', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="da"><body>{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
