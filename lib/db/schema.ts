import { pgTable, text, timestamp, boolean, date, integer, jsonb } from "drizzle-orm/pg-core"

export const user = pgTable("user", { id: text("id").primaryKey(), name: text("name").notNull(), email: text("email").notNull().unique(), emailVerified: boolean("emailVerified").notNull().default(false), image: text("image"), role: text("role").notNull().default("user"), createdAt: timestamp("createdAt").notNull().defaultNow(), updatedAt: timestamp("updatedAt").notNull().defaultNow() })
export const session = pgTable("session", { id: text("id").primaryKey(), expiresAt: timestamp("expiresAt").notNull(), token: text("token").notNull().unique(), createdAt: timestamp("createdAt").notNull().defaultNow(), updatedAt: timestamp("updatedAt").notNull().defaultNow(), ipAddress: text("ipAddress"), userAgent: text("userAgent"), userId: text("userId").notNull() })
export const account = pgTable("account", { id: text("id").primaryKey(), accountId: text("accountId").notNull(), providerId: text("providerId").notNull(), userId: text("userId").notNull(), password: text("password"), accessToken: text("accessToken"), refreshToken: text("refreshToken"), idToken: text("idToken"), accessTokenExpiresAt: timestamp("accessTokenExpiresAt"), refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"), scope: text("scope"), createdAt: timestamp("createdAt").notNull().defaultNow(), updatedAt: timestamp("updatedAt").notNull().defaultNow() })
export const verification = pgTable("verification", { id: text("id").primaryKey(), identifier: text("identifier").notNull(), value: text("value").notNull(), expiresAt: timestamp("expiresAt").notNull(), createdAt: timestamp("createdAt").notNull().defaultNow(), updatedAt: timestamp("updatedAt").notNull().defaultNow() })

export const machine = pgTable("machine", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  dailyPrice: integer("dailyPrice").notNull(),
  image: text("image").notNull(),
  active: boolean("active").notNull().default(true),
  specifications: jsonb("specifications").$type<Record<string, string>>().notNull().default({}),
  manufacturer: text("manufacturer").notNull().default("Maskinudlejning"),
  model: text("model").notNull().default(""),
  deposit: integer("deposit").notNull().default(0),
  deliveryAvailable: boolean("deliveryAvailable").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const accessory = pgTable("accessory", {
  id: text("id").primaryKey(),
  machineId: text("machineId").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  dailyPrice: integer("dailyPrice").notNull(),
  deposit: integer("deposit").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const deliveryZone = pgTable("delivery_zone", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  postalCodes: text("postalCodes").notNull(),
  deliveryFee: integer("deliveryFee").notNull(),
  collectionFee: integer("collectionFee").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const booking = pgTable("booking", {
  id: text("id").primaryKey(),
  userId: text("userId").notNull(),
  machineName: text("machineName").notNull(),
  machineSlug: text("machineSlug").notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  customerName: text("customerName").notNull(),
  customerEmail: text("customerEmail").notNull(),
  customerPhone: text("customerPhone").notNull(),
  notes: text("notes"),
  deliveryType: text("deliveryType").notNull().default("collection"),
  deliveryAddress: text("deliveryAddress"),
  deliveryPostalCode: text("deliveryPostalCode"),
  deliveryFee: integer("deliveryFee").notNull().default(0),
  deposit: integer("deposit").notNull().default(0),
  status: text("status").notNull().default("pending"),
  total: integer("total").notNull().default(0),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
})

export const bookingItem = pgTable("booking_item", {
  id: text("id").primaryKey(),
  bookingId: text("bookingId").notNull(),
  accessoryId: text("accessoryId"),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unitPrice").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
})
