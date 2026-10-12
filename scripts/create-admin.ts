import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function usage(): void {
  console.log("Promote an existing local account to administrator.");
  console.log("Usage: npm run admin:create [-- email@example.com]");
}

async function readEmailArgument(): Promise<string | null> {
  const argument = process.argv[2];
  if (argument === "--help" || argument === "-h") {
    usage();
    return null;
  }
  if (argument) {
    return argument.trim().toLowerCase();
  }
  if (!stdin.isTTY) {
    usage();
    throw new Error("Provide an existing account email when running non-interactively.");
  }

  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    return (await prompt.question("Existing account email to promote: ")).trim().toLowerCase();
  } finally {
    prompt.close();
  }
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Refusing to change administrator roles in production.");
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set before creating an administrator.");
  }

  const databaseHost = new URL(databaseUrl).hostname;
  if (!["localhost", "127.0.0.1", "[::1]"].includes(databaseHost)) {
    throw new Error(`Refusing to modify a non-local database host: ${databaseHost}`);
  }

  const email = await readEmailArgument();
  if (email === null) {
    return;
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Provide a valid account email address.");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, role: true },
    });
    if (!user) {
      throw new Error("No account exists with that email. Register the account first.");
    }
    if (user.role === "ADMIN") {
      console.log(`${user.email} is already an administrator.`);
      return;
    }

    const admin = await prisma.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
      select: { name: true, email: true, role: true },
    });
    console.log(`Promoted ${admin.name} (${admin.email}) to ${admin.role}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Admin creation failed.");
  process.exitCode = 1;
});