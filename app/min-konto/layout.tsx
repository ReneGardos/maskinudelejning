import type { Metadata } from "next"
import { noIndex } from "@/lib/site"

export const metadata: Metadata = { title: "Min konto", ...noIndex }

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children
}
