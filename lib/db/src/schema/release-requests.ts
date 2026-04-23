import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { inventoryItemsTable } from "./inventory";

export const releaseRequestsTable = pgTable("release_requests", {
  id: serial("id").primaryKey(),
  inventoryItemId: integer("inventory_item_id").notNull().references(() => inventoryItemsTable.id),
  requestedBy: text("requested_by").notNull(),
  requestedByEmail: text("requested_by_email").notNull(),
  quantity: integer("quantity").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertReleaseRequestSchema = createInsertSchema(releaseRequestsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertReleaseRequest = z.infer<typeof insertReleaseRequestSchema>;
export type ReleaseRequest = typeof releaseRequestsTable.$inferSelect;
