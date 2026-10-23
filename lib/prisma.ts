import { logOperationalError } from "./operational-error";
import { disposableDatabaseUrl } from "./disposable-database-url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set before using the database.");
}

// Refuse test/demo overrides before Prisma can establish a connection. Ordinary
// application bindings are not reconfigured by the disposable-test policy.
if (process.env.MRT_TEST_RUN_ID || process.env.MRT_TEST_DATABASE_URL) {
  databaseUrl = disposableDatabaseUrl(databaseUrl).toString();
}

try {
  new URL(databaseUrl);
} catch {
  throw new Error("Invalid database connection URL; private details omitted.");
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrisma() {
  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl! }),
    log: [{ emit: "event", level: "error" }],
  });
  client.$on("error", () => {
    logOperationalError("database.query", undefined);
  });
  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
