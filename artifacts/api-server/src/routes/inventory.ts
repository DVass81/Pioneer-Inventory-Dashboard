import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, inventoryItemsTable, stockMovementsTable } from "@workspace/db";
import {
  GetInventoryItemParams,
  GetInventoryItemResponse,
  GetInventorySummaryResponse,
  ListInventoryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/inventory/summary", async (req, res): Promise<void> => {
  const items = await db.select().from(inventoryItemsTable);
  const totalItems = items.length;
  const lowStockCount = items.filter(
    (i) => i.lowStockThreshold != null && i.currentStock <= i.lowStockThreshold
  ).length;
  const totalSheets = items.reduce((sum, i) => sum + i.currentStock, 0);

  const categoryMap: Record<string, { count: number; totalStock: number }> = {};
  for (const item of items) {
    if (!categoryMap[item.category]) {
      categoryMap[item.category] = { count: 0, totalStock: 0 };
    }
    categoryMap[item.category].count++;
    categoryMap[item.category].totalStock += item.currentStock;
  }
  const categoryBreakdown = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    ...data,
  }));

  const pendingResult = await db.execute(
    sql`SELECT COUNT(*) as count FROM release_requests WHERE status = 'pending'`
  );
  const pendingRequests = parseInt((pendingResult.rows[0] as { count: string }).count, 10);

  const recentResult = await db.execute(
    sql`SELECT COUNT(*) as count FROM release_requests WHERE created_at > NOW() - INTERVAL '7 days'`
  );
  const recentRequestsCount = parseInt((recentResult.rows[0] as { count: string }).count, 10);

  const summary = GetInventorySummaryResponse.parse({
    totalItems,
    lowStockCount,
    totalSheets,
    pendingRequests,
    recentRequestsCount,
    categoryBreakdown,
  });

  res.json(summary);
});

router.get("/inventory/export", async (req, res): Promise<void> => {
  const items = await db.select().from(inventoryItemsTable).orderBy(inventoryItemsTable.category, inventoryItemsTable.product);

  const headers = ["Product", "Category", "Thickness", "Sheet Size", "Weight/Sheet (lbs)", "Current Stock", "Unit", "Low Stock Threshold"];
  const rows = items.map((i) => [
    i.product,
    i.category,
    i.thickness ?? "",
    i.sheetSize ?? "",
    i.weightPerSheet ?? "",
    i.currentStock,
    i.unit,
    i.lowStockThreshold ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="pioneer-inventory-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
});

router.get("/inventory", async (req, res): Promise<void> => {
  const items = await db.select().from(inventoryItemsTable).orderBy(inventoryItemsTable.category, inventoryItemsTable.product);
  res.json(ListInventoryResponse.parse(items.map((i) => ({
    ...i,
    weightPerSheet: i.weightPerSheet != null ? parseFloat(i.weightPerSheet) : null,
  }))));
});

router.get("/inventory/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetInventoryItemParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [item] = await db
    .select()
    .from(inventoryItemsTable)
    .where(eq(inventoryItemsTable.id, params.data.id));

  if (!item) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }

  res.json(GetInventoryItemResponse.parse({
    ...item,
    weightPerSheet: item.weightPerSheet != null ? parseFloat(item.weightPerSheet) : null,
  }));
});

router.post("/inventory", async (req, res): Promise<void> => {
  const { category, product, thickness, sheetSize, weightPerSheet, currentStock, unit, lowStockThreshold } = req.body;

  if (!category || !product || !unit) {
    res.status(400).json({ error: "category, product, and unit are required" });
    return;
  }

  const [item] = await db.insert(inventoryItemsTable).values({
    category,
    product,
    thickness: thickness || null,
    sheetSize: sheetSize || null,
    weightPerSheet: weightPerSheet ?? null,
    currentStock: currentStock ?? 0,
    unit,
    lowStockThreshold: lowStockThreshold ?? null,
  }).returning();

  res.status(201).json({
    ...item,
    weightPerSheet: item.weightPerSheet != null ? parseFloat(item.weightPerSheet) : null,
  });
});

router.patch("/inventory/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { category, product, thickness, sheetSize, weightPerSheet, unit, lowStockThreshold } = req.body;

  const [existing] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }

  await db.update(inventoryItemsTable).set({
    category: category ?? existing.category,
    product: product ?? existing.product,
    thickness: thickness !== undefined ? (thickness || null) : existing.thickness,
    sheetSize: sheetSize !== undefined ? (sheetSize || null) : existing.sheetSize,
    weightPerSheet: weightPerSheet !== undefined ? weightPerSheet : existing.weightPerSheet,
    unit: unit ?? existing.unit,
    lowStockThreshold: lowStockThreshold !== undefined ? lowStockThreshold : existing.lowStockThreshold,
    updatedAt: new Date(),
  }).where(eq(inventoryItemsTable.id, id));

  const [updated] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, id));
  res.json({
    ...updated,
    weightPerSheet: updated.weightPerSheet != null ? parseFloat(updated.weightPerSheet) : null,
  });
});

router.post("/inventory/:id/adjust", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { amount, notes } = req.body;

  if (typeof amount !== "number" || amount === 0) {
    res.status(400).json({ error: "amount must be a non-zero number" });
    return;
  }

  const [item] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, id));
  if (!item) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }

  const newStock = item.currentStock + amount;
  if (newStock < 0) {
    res.status(400).json({ error: `Cannot reduce stock below 0. Current stock: ${item.currentStock}` });
    return;
  }

  await db.update(inventoryItemsTable)
    .set({ currentStock: newStock, updatedAt: new Date() })
    .where(eq(inventoryItemsTable.id, id));

  await db.insert(stockMovementsTable).values({
    inventoryItemId: id,
    changeAmount: amount,
    stockAfter: newStock,
    reason: amount > 0 ? "manual_receipt" : "manual_deduction",
    notes: notes ?? null,
  });

  const [updated] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, id));
  res.json({
    ...updated,
    weightPerSheet: updated.weightPerSheet != null ? parseFloat(updated.weightPerSheet) : null,
  });
});

router.patch("/inventory/:id/threshold", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { threshold } = req.body;

  if (threshold !== null && (typeof threshold !== "number" || threshold < 0)) {
    res.status(400).json({ error: "threshold must be a non-negative number or null" });
    return;
  }

  const [item] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, id));
  if (!item) {
    res.status(404).json({ error: "Inventory item not found" });
    return;
  }

  await db.update(inventoryItemsTable)
    .set({ lowStockThreshold: threshold, updatedAt: new Date() })
    .where(eq(inventoryItemsTable.id, id));

  const [updated] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, id));
  res.json({
    ...updated,
    weightPerSheet: updated.weightPerSheet != null ? parseFloat(updated.weightPerSheet) : null,
  });
});

router.get("/inventory/:id/movements", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);

  const movements = await db
    .select()
    .from(stockMovementsTable)
    .where(eq(stockMovementsTable.inventoryItemId, id))
    .orderBy(desc(stockMovementsTable.createdAt))
    .limit(100);

  res.json(movements);
});

export default router;
