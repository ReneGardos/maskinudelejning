import { betterAuth } from "better-auth"
import { pool } from "./db"

const originValues = [process.env.V0_RUNTIME_URL, process.env.V0_DEV_APP_URL, process.env.V0_BUILD_URL, process.env.V0_SANDBOX_URL].filter(Boolean) as string[]
const trustedOrigins = ["http://localhost:3000", ...originValues]

// Kommasepareret liste af e-mails, der automatisk bliver admin ved oprettelse af konto.
const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean)

export const auth = betterAuth({
  database: pool,
  emailAndPassword: { enabled: true },
  baseURL: process.env.BETTER_AUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : process.env.V0_RUNTIME_URL),
  trustedOrigins,
  user: {
    additionalFields: {
      // input: false = rollen kan aldrig sættes fra tilmeldingsformularen.
      role: { type: "string", required: false, defaultValue: "user", input: false },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (newUser) => ({
          data: { ...newUser, role: adminEmails.includes(String(newUser.email).toLowerCase()) ? "admin" : "user" },
        }),
      },
    },
  },
  ...(process.env.NODE_ENV === "development" ? { advanced: { defaultCookieAttributes: { sameSite: "none" as const, secure: true } } } : {}),
})
