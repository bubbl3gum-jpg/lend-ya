import "dotenv/config";
import { prisma } from "../lib/prisma";
import { readEmailConfig } from "../lib/email/config";
import { processNextEmail, purgeExpiredEmails } from "../lib/email/worker";

async function main() {
  if (process.argv.includes("--cleanup")) {
    try { await purgeExpiredEmails(prisma); }
    finally { await prisma.$disconnect(); }
    return;
  }
  const config = readEmailConfig();
  if (!config) throw new Error("Recovery email delivery is disabled.");
  let stopping = false;
  process.once("SIGINT", () => { stopping = true; });
  process.once("SIGTERM", () => { stopping = true; });
  console.log("Hustlen' email worker started. Provider acceptance does not establish inbox delivery.");
  try {
    do {
      const result = await processNextEmail(prisma, config);
      if (process.argv.includes("--once")) break;
      // Pace requests below the provider's default per-second sending limit.
      await new Promise((resolve) => setTimeout(resolve, result === "idle" || result === "paused" ? 2_000 : 1_000));
    } while (!stopping);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  // Provider/DB errors can include sensitive parameters; keep process output generic.
  console.error("Email worker stopped. Check configuration and database availability; pending jobs remain stored.");
  process.exitCode = 1;
});
