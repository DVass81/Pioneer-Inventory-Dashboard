import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, inventoryItemsTable } from "@workspace/db";
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

export default router;
