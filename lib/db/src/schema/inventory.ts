import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const inventoryItemsTable = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  product: text("product").notNull(),
  thickness: text("thickness"),
  sheetSize: text("sheet_size"),
  weightPerSheet: numeric("weight_per_sheet", { precision: 10, scale: 4 }),
  currentStock: integer("current_stock").notNull().default(0),
  unit: text("unit").notNull().default("sheets"),
  lowStockThreshold: integer("low_stock_threshold"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const stockMovementsTable = pgTable("stock_movements", {
  id: serial("id").primaryKey(),
  inventoryItemId: integer("inventory_item_id").notNull().references(() => inventoryItemsTable.id),
  changeAmount: integer("change_amount").notNull(),
  stockAfter: integer("stock_after").notNull(),
  reason: text("reason").notNull(),
  releaseRequestId: integer("release_request_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItemsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItemsTable.$inferSelect;
export type StockMovement = typeof stockMovementsTable.$inferSelect;
