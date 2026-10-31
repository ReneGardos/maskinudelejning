import { betterAuth } from "better-auth"
import { pool } from "./db"

const originValues = [process.env.V0_RUNTIME_URL, process.env.V0_DEV_APP_URL, process.env.V0_BUILD_URL, process.env.V0_SANDBOX_URL].filter(Boolean) as string[]
const trustedOrigins = ["http://localhost:3000", ...originValues]

export const auth = betterAuth({
  database: pool,
  emailAndPassword: { enabled: true },
  baseURL: process.env.BETTER_AUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.V0_RUNTIME_URL),
  trustedOrigins,
  ...(process.env.NODE_ENV === "development" ? { advanced: { defaultCookieAttributes: { sameSite: "none" as const, secure: true } } } : {}),
})
