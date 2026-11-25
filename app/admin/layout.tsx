import type { Metadata } from "next"
import { noIndex } from "@/lib/site"

export const metadata: Metadata = { title: "Administration", ...noIndex }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children
}
