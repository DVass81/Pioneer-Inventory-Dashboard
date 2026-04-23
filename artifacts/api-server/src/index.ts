import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query(`
      UPDATE release_requests SET requested_by = 'Daniel Vass', requested_by_email = 'dvass@iccinternational.com'
      WHERE requested_by IN ('Amy Williams', 'Tom Bradley', 'John Martinez', 'Sarah Chen')
        AND requested_by_email LIKE '%@example.com'
        AND id % 2 = 0;
      UPDATE release_requests SET requested_by = 'Sharon Crisp', requested_by_email = 'scrisp@iccinternational.com'
      WHERE requested_by IN ('Amy Williams', 'Tom Bradley', 'John Martinez', 'Sarah Chen')
        AND requested_by_email LIKE '%@example.com'
        AND id % 2 = 1;
    `);
    logger.info("Startup migration complete: updated placeholder request names");
  } catch (err) {
    logger.warn({ err }, "Startup migration skipped or already applied");
  } finally {
    client.release();
  }
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  await runMigrations();
});
