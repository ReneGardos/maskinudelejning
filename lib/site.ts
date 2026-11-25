// Sitets offentlige adresse. Sæt NEXT_PUBLIC_SITE_URL, når I får jeres eget domæne (fx https://www.maskinudlejning.dk).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://maskinudelejning.vercel.app").replace(/\/$/, "")
export const SITE_NAME = "Maskinudlejning"
export const SITE_AREA = "Herning og Midtjylland"
export const absoluteUrl = (path: string) => (/^https?:\/\//.test(path) ? path : `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`)
/** Til sider, der ikke skal i Googles søgeresultater (login, konto, admin). */
export const noIndex = { robots: { index: false, follow: false } } as const
