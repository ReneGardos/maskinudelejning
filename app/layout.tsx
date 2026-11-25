import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { SITE_AREA, SITE_NAME, SITE_URL } from '@/lib/site'
import './globals.css'

const description = `Lej pladevibrator, betonblander, brydehammer og flamingoskærer i ${SITE_AREA}. Se ledighed og pris med det samme, book online, og få leveret eller hent selv.`

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `Maskinudlejning i ${SITE_AREA} | Book online`, template: `%s | ${SITE_NAME}` },
  description,
  applicationName: SITE_NAME,
  keywords: ['maskinudlejning', 'lej maskiner', 'udlejning Herning', 'lej pladevibrator', 'lej betonblander', 'lej brydehammer', 'lej flamingoskærer', 'materieludlejning Midtjylland'],
  alternates: { canonical: '/' },
  openGraph: { type: 'website', locale: 'da_DK', siteName: SITE_NAME, title: `Maskinudlejning i ${SITE_AREA}`, description, url: '/', images: [{ url: '/maskiner-hero.png', alt: 'Maskiner til udlejning' }] },
  twitter: { card: 'summary_large_image', title: `Maskinudlejning i ${SITE_AREA}`, description, images: ['/maskiner-hero.png'] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = { colorScheme: 'light', themeColor: '#171a1b', width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="da"><body>{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
