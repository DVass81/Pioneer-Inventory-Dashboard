import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, releaseRequestsTable, inventoryItemsTable } from "@workspace/db";
import { sendReleaseRequestEmail, sendComposeEmail } from "../lib/email";

const router: IRouter = Router();

router.post("/email/compose", async (req, res): Promise<void> => {
  const { fromName, fromEmail, subject, message } = req.body;

  if (!fromName || !fromEmail || !subject || !message) {
    res.status(400).json({ error: "fromName, fromEmail, subject, and message are required" });
    return;
  }

  try {
    await sendComposeEmail({ fromName, fromEmail, subject, message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to send email" });
  }
});

router.post("/email/resend/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);

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

  await sendReleaseRequestEmail({
    requestedBy: request.requestedBy,
    requestedByEmail: request.requestedByEmail,
    product: item.product,
    quantity: request.quantity,
    unit: item.unit,
    notes: request.notes,
    requestId: request.id,
    currentStockAfter: item.currentStock,
  });

  res.json({ success: true });
});

export default router;
