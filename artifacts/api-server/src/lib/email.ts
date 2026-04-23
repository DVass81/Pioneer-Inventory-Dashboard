import nodemailer from "nodemailer";
import { logger } from "./logger";

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
}): Promise<void> {
  const { requestedBy, requestedByEmail, product, quantity, unit, notes, requestId } = opts;
  const recipientEmail = process.env.RELEASE_REQUEST_EMAIL ?? process.env.SMTP_USER;

  const subject = `Inventory Release Request #${requestId} — ${product}`;
  const body = `
A new inventory release request has been submitted.

Request ID: ${requestId}
Product: ${product}
Quantity Requested: ${quantity} ${unit}
Requested By: ${requestedBy} <${requestedByEmail}>
${notes ? `Notes: ${notes}` : ""}

Please review and process this request.
  `.trim();

  logger.info({ requestId, product, quantity, requestedByEmail }, "Release request email triggered");

  const transporter = createTransporter();
  if (!transporter) {
    logger.info({ subject, body, to: recipientEmail }, "Email (not sent — SMTP not configured)");
    return;
  }

  if (!recipientEmail) {
    logger.warn("No recipient email configured (RELEASE_REQUEST_EMAIL or SMTP_USER)");
    return;
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to: recipientEmail,
      subject,
      text: body,
    });
    logger.info({ requestId, to: recipientEmail }, "Release request email sent");
  } catch (err) {
    logger.error({ err, requestId }, "Failed to send release request email");
  }
}
