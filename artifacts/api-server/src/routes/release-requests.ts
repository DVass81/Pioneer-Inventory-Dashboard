import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, inventoryItemsTable, releaseRequestsTable, stockMovementsTable } from "@workspace/db";
import {
  CreateReleaseRequestBody,
  GetReleaseRequestParams,
  GetReleaseRequestResponse,
  GetRecentReleaseRequestsQueryParams,
  ListReleaseRequestsQueryParams,
  ListReleaseRequestsResponse,
  GetRecentReleaseRequestsResponse,
} from "@workspace/api-zod";
import { sendReleaseRequestEmail } from "../lib/email";

const router: IRouter = Router();

function buildReleaseRequestResponse(rr: typeof releaseRequestsTable.$inferSelect, item: typeof inventoryItemsTable.$inferSelect) {
  return {
    ...rr,
    inventoryItem: {
      ...item,
      weightPerSheet: item.weightPerSheet != null ? parseFloat(item.weightPerSheet) : null,
    },
  };
}

router.get("/release-requests/recent", async (req, res): Promise<void> => {
  const queryParsed = GetRecentReleaseRequestsQueryParams.safeParse(req.query);
  const limit = queryParsed.success && queryParsed.data.limit ? queryParsed.data.limit : 10;

  const rows = await db
    .select()
    .from(releaseRequestsTable)
    .leftJoin(inventoryItemsTable, eq(releaseRequestsTable.inventoryItemId, inventoryItemsTable.id))
    .orderBy(desc(releaseRequestsTable.createdAt))
    .limit(limit);

  const result = rows.map((r) => buildReleaseRequestResponse(r.release_requests, r.inventory_items!));
  res.json(GetRecentReleaseRequestsResponse.parse(result));
});

router.get("/release-requests", async (req, res): Promise<void> => {
  const queryParsed = ListReleaseRequestsQueryParams.safeParse(req.query);
  const limit = queryParsed.success && queryParsed.data.limit ? queryParsed.data.limit : 100;
  const status = queryParsed.success ? queryParsed.data.status : undefined;

  let query = db
    .select()
    .from(releaseRequestsTable)
    .leftJoin(inventoryItemsTable, eq(releaseRequestsTable.inventoryItemId, inventoryItemsTable.id))
    .orderBy(desc(releaseRequestsTable.createdAt))
    .limit(limit);

  if (status) {
    const rows = await db
      .select()
      .from(releaseRequestsTable)
      .leftJoin(inventoryItemsTable, eq(releaseRequestsTable.inventoryItemId, inventoryItemsTable.id))
      .where(eq(releaseRequestsTable.status, status))
      .orderBy(desc(releaseRequestsTable.createdAt))
      .limit(limit);
    const result = rows.map((r) => buildReleaseRequestResponse(r.release_requests, r.inventory_items!));
    res.json(ListReleaseRequestsResponse.parse(result));
    return;
  }

  const rows = await query;
  const result = rows.map((r) => buildReleaseRequestResponse(r.release_requests, r.inventory_items!));
  res.json(ListReleaseRequestsResponse.parse(result));
});

router.post("/release-requests", async (req, res): Promise<void> => {
  const parsed = CreateReleaseRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { inventoryItemId, requestedBy, requestedByEmail, quantity, notes } = parsed.data;

  const [item] = await db
    .select()
    .from(inventoryItemsTable)
    .where(eq(inventoryItemsTable.id, inventoryItemId));

  if (!item) {
    res.status(400).json({ error: "Inventory item not found" });
    return;
  }

  if (item.currentStock < quantity) {
    res.status(400).json({ error: `Insufficient stock. Current stock: ${item.currentStock} ${item.unit}` });
    return;
  }

  const [releaseRequest] = await db
    .insert(releaseRequestsTable)
    .values({
      inventoryItemId,
      requestedBy,
      requestedByEmail,
      quantity,
      notes: notes ?? null,
      status: "pending",
    })
    .returning();

  // Inventory is NOT deducted on submission — it deducts only when marked Completed
  await sendReleaseRequestEmail({
    requestedBy,
    requestedByEmail,
    product: item.product,
    quantity,
    unit: item.unit,
    notes: notes ?? null,
    requestId: releaseRequest.id,
    currentStockAfter: item.currentStock,
  });

  res.status(201).json(GetReleaseRequestResponse.parse(buildReleaseRequestResponse(releaseRequest, item)));
});

router.patch("/release-requests/:id/status", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { status: newStatus } = req.body;

  const validStatuses = ["pending", "approved", "completed", "rejected"];
  if (!newStatus || !validStatuses.includes(newStatus)) {
    res.status(400).json({ error: `Status must be one of: ${validStatuses.join(", ")}` });
    return;
  }

  // Load existing request + item
  const rows = await db
    .select()
    .from(releaseRequestsTable)
    .leftJoin(inventoryItemsTable, eq(releaseRequestsTable.inventoryItemId, inventoryItemsTable.id))
    .where(eq(releaseRequestsTable.id, id));

  if (!rows.length || !rows[0].inventory_items) {
    res.status(404).json({ error: "Release request not found" });
    return;
  }

  const request = rows[0].release_requests;
  const item = rows[0].inventory_items;
  const oldStatus = request.status;

  // Deduct inventory when completing; restore if moving away from completed
  if (newStatus === "completed" && oldStatus !== "completed") {
    if (item.currentStock < request.quantity) {
      res.status(400).json({ error: `Insufficient stock to complete. Only ${item.currentStock} ${item.unit} available.` });
      return;
    }
    const newStock = item.currentStock - request.quantity;
    await db
      .update(inventoryItemsTable)
      .set({ currentStock: newStock, updatedAt: new Date() })
      .where(eq(inventoryItemsTable.id, item.id));
    await db.insert(stockMovementsTable).values({
      inventoryItemId: item.id,
      changeAmount: -request.quantity,
      stockAfter: newStock,
      reason: "release_completed",
      releaseRequestId: request.id,
      notes: `Release request #${request.id} completed by ${request.requestedBy}`,
    });
  } else if (oldStatus === "completed" && newStatus !== "completed") {
    const newStock = item.currentStock + request.quantity;
    await db
      .update(inventoryItemsTable)
      .set({ currentStock: newStock, updatedAt: new Date() })
      .where(eq(inventoryItemsTable.id, item.id));
    await db.insert(stockMovementsTable).values({
      inventoryItemId: item.id,
      changeAmount: request.quantity,
      stockAfter: newStock,
      reason: "release_undone",
      releaseRequestId: request.id,
      notes: `Release request #${request.id} marked incomplete — stock restored`,
    });
  }

  await db
    .update(releaseRequestsTable)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(releaseRequestsTable.id, id));

  const updatedRows = await db
    .select()
    .from(releaseRequestsTable)
    .leftJoin(inventoryItemsTable, eq(releaseRequestsTable.inventoryItemId, inventoryItemsTable.id))
    .where(eq(releaseRequestsTable.id, id));

  const row = updatedRows[0];
  res.json(buildReleaseRequestResponse(row.release_requests, row.inventory_items!));
});

router.get("/release-requests/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetReleaseRequestParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(releaseRequestsTable)
    .leftJoin(inventoryItemsTable, eq(releaseRequestsTable.inventoryItemId, inventoryItemsTable.id))
    .where(eq(releaseRequestsTable.id, params.data.id));

  if (!rows.length || !rows[0].inventory_items) {
    res.status(404).json({ error: "Release request not found" });
    return;
  }

  const row = rows[0];
  res.json(GetReleaseRequestResponse.parse(buildReleaseRequestResponse(row.release_requests, row.inventory_items)));
});

export default router;
