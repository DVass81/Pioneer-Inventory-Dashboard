import nodemailer from "nodemailer";
import { logger } from "./logger";

const PIONEER_RECIPIENTS = [
  "Taylor.vincent@pioneerindustrialsales.com",
  "shane.parks@pioneerindustrialsales.com",
  "paul.hester@pioneerindustrialsales.com",
  "hank.pennington@pioneerindustrialsales.com",
];

function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    logger.warn("SMTP not configured — emails will be logged only");
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendReleaseRequestEmail(opts: {
  requestedBy: string;
  requestedByEmail: string;
  product: string;
  quantity: number;
  unit: string;
  notes?: string | null;
  requestId: number;
  currentStockAfter: number;
}): Promise<void> {
  const { requestedBy, requestedByEmail, product, quantity, unit, notes, requestId, currentStockAfter } = opts;

  const subject = `[ICC International] Inventory Release Request #${requestId} — ${product}`;
  const body = `
ICC International — Pioneer Inventory Release Request
======================================================

A new inventory release request has been submitted and the stock level has been updated.

Request Details
---------------
Request ID:       #${requestId}
Product:          ${product}
Quantity:         ${quantity} ${unit}
Remaining Stock:  ${currentStockAfter} ${unit}
Requested By:     ${requestedBy}
Requester Email:  ${requestedByEmail}
${notes ? `Notes:            ${notes}` : ""}

This request is now pending your approval and fulfillment.
Please log in to the ICC International Inventory Dashboard to review and update the status.

---
Pioneer Industrial Sales
www.pioneerindustrialsales.com
  `.trim();

  logger.info(
    { requestId, product, quantity, requestedByEmail, recipients: PIONEER_RECIPIENTS },
    "Release request email triggered"
  );

  const transporter = createTransporter();
  if (!transporter) {
    logger.info(
      { subject, body, to: PIONEER_RECIPIENTS.join(", ") },
      "Email (not sent — SMTP not configured)"
    );
    return;
  }

  try {
    await transporter.sendMail({
      from: `ICC International Inventory <${process.env.SMTP_USER}>`,
      to: PIONEER_RECIPIENTS.join(", "),
      replyTo: requestedByEmail,
      subject,
      text: body,
    });
    logger.info({ requestId, recipients: PIONEER_RECIPIENTS }, "Release request email sent to Pioneer team");
  } catch (err) {
    logger.error({ err, requestId }, "Failed to send release request email");
  }
}
