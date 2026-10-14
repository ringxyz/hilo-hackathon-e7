// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
export const users = sqliteTable("users", { id: text("id").primaryKey(), settings: text("settings").notNull(), createdAt: integer("created_at").notNull() });
export const activities = sqliteTable("activities", { id: text("id").primaryKey(), owner: text("owner").notNull().references(() => users.id), payload: text("payload").notNull(), revision: integer("revision").notNull().default(1), updatedAt: integer("updated_at").notNull() });
export const sessions = sqliteTable("sessions", { owner: text("owner").primaryKey().references(() => users.id), payload: text("payload").notNull() });
export const captures = sqliteTable("captures", { id: text("id").primaryKey(), owner: text("owner").notNull().references(() => users.id), result: text("result").notNull(), createdAt: integer("created_at").notNull() });
export const integrations = sqliteTable("integrations", { owner: text("owner").primaryKey().references(() => users.id), encrypted: text("encrypted").notNull() });
export const oauthStates = sqliteTable("oauth_states", { id: text("id").primaryKey(), owner: text("owner").notNull(), expiresAt: integer("expires_at").notNull() });
