// Bruges sådan:
//   pnpm db:migrate   opretter/opdaterer tabeller
//   pnpm db:seed      indsætter eksempelmaskiner
//   pnpm db:admin you@example.com   gør en eksisterende bruger til admin
import { readFileSync, readdirSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import pg from "pg"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const [command, arg] = process.argv.slice(2)

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL mangler. Kopiér .env.example til .env.local og udfyld den.")
  process.exit(1)
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
await client.connect()

try {
  if (command === "migrate") {
    const dir = join(root, "db", "migrations")
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      console.log(`Kører ${file} …`)
      await client.query(readFileSync(join(dir, file), "utf8"))
    }
    console.log("Færdig.")
  } else if (command === "seed") {
    await client.query(readFileSync(join(root, "db", "seed.sql"), "utf8"))
    console.log("Maskiner indsat.")
  } else if (command === "admin") {
    if (!arg) throw new Error("Brug: pnpm db:admin you@example.com")
    const res = await client.query(`UPDATE "user" SET "role" = 'admin' WHERE lower("email") = lower($1)`, [arg])
    console.log(res.rowCount ? `${arg} er nu admin.` : `Ingen bruger med e-mailen ${arg}. Opret kontoen først.`)
  } else {
    throw new Error("Ukendt kommando. Brug: migrate | seed | admin <email>")
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await client.end()
}
