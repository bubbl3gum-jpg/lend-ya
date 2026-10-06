import "dotenv/config";
import { scryptSync } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set before running the development seed.");
}

const databaseHost = new URL(databaseUrl).hostname;
if (!["localhost", "127.0.0.1", "[::1]"].includes(databaseHost)) {
  throw new Error(`Refusing to seed non-local database host: ${databaseHost}`);
}

if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to run development seed with NODE_ENV=production.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

function developmentPasswordHash(email: string): string {
  const salt = `p2p-marketplace-seed:${email}`;
  const derivedKey = scryptSync("LocalDev123!", salt, 64).toString("hex");
  return `scrypt$${salt}$${derivedKey}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

async function main(): Promise<void> {
  const alice = await prisma.user.upsert({
    where: { email: "alice@example.test" },
    update: {
      name: "Alice",
      role: "USER",
      verificationStatus: "VERIFIED",
      passwordHash: developmentPasswordHash("alice@example.test"),
    },
    create: {
      name: "Alice",
      email: "alice@example.test",
      passwordHash: developmentPasswordHash("alice@example.test"),
      role: "USER",
      verificationStatus: "VERIFIED",
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: "bob@example.test" },
    update: {
      name: "Bob",
      role: "USER",
      passwordHash: developmentPasswordHash("bob@example.test"),
    },
    create: {
      name: "Bob",
      email: "bob@example.test",
      passwordHash: developmentPasswordHash("bob@example.test"),
      role: "USER",
    },
  });

  const charlie = await prisma.user.upsert({
    where: { email: "charlie@example.test" },
    update: {
      name: "Charlie",
      role: "USER",
      verificationStatus: "VERIFIED",
      passwordHash: developmentPasswordHash("charlie@example.test"),
    },
    create: {
      name: "Charlie",
      email: "charlie@example.test",
      passwordHash: developmentPasswordHash("charlie@example.test"),
      role: "USER",
      verificationStatus: "VERIFIED",
    },
  });

  const stations = await Promise.all([
    prisma.mrtStation.upsert({ where: { code: "TPE" }, update: { name: "Taipei Main Station" }, create: { code: "TPE", name: "Taipei Main Station" } }),
    prisma.mrtStation.upsert({ where: { code: "ZSH" }, update: { name: "Zhongshan" }, create: { code: "ZSH", name: "Zhongshan" } }),
    prisma.mrtStation.upsert({ where: { code: "XIM" }, update: { name: "Ximen" }, create: { code: "XIM", name: "Ximen" } }),
    prisma.mrtStation.upsert({ where: { code: "JNT" }, update: { name: "Jiantan" }, create: { code: "JNT", name: "Jiantan" } }),
    prisma.mrtStation.upsert({ where: { code: "SSH" }, update: { name: "Songshan" }, create: { code: "SSH", name: "Songshan" } }),
  ]);

  const stationByCode = Object.fromEntries(stations.map((station) => [station.code, station]));

  const ensureListing = async (input: {
    ownerId: number;
    title: string;
    description: string;
    category: string;
    type: "RENTAL" | "SERVICE";
    price: string;
    deposit?: string;
    condition: string;
    status: "ACTIVE" | "INACTIVE";
    stationCodes: string[];
  }) => {
    const existing = await prisma.listing.findFirst({
      where: { ownerId: input.ownerId, title: input.title },
    });

    const listing = existing
      ? await prisma.listing.update({
          where: { id: existing.id },
          data: {
            description: input.description,
            category: input.category,
            type: input.type,
            price: input.price,
            deposit: input.deposit ?? null,
            condition: input.condition,
            status: input.status,
          },
        })
      : await prisma.listing.create({
          data: {
            ownerId: input.ownerId,
            title: input.title,
            description: input.description,
            category: input.category,
            type: input.type,
            price: input.price,
            deposit: input.deposit ?? null,
            condition: input.condition,
            status: input.status,
          },
        });

    const stationIds = input.stationCodes.map((code) => stationByCode[code].id);
    await prisma.listingStation.deleteMany({ where: { listingId: listing.id } });
    await Promise.all(
      stationIds.map((stationId) =>
        prisma.listingStation.create({
          data: {
            listingId: listing.id,
            stationId,
          },
        }),
      ),
    );

    return listing;
  };

  const camera = await ensureListing({
    ownerId: alice.id,
    title: "Sony A7 III Camera",
    description: "Full-frame camera with body, charger, battery, and carry case. Great for travel, events, and portraits.",
    category: "Camera",
    type: "RENTAL",
    price: "800.00",
    deposit: "10000.00",
    condition: "Good",
    status: "ACTIVE",
    stationCodes: ["TPE", "ZSH", "XIM"],
  });

  const tent = await ensureListing({
    ownerId: alice.id,
    title: "Three-Person Camping Tent",
    description: "Durable hiking tent with rainfly, poles, and groundsheet. Ready for a weekend trip.",
    category: "Camping",
    type: "RENTAL",
    price: "200.00",
    deposit: "1000.00",
    condition: "Excellent",
    status: "ACTIVE",
    stationCodes: ["TPE", "JNT"],
  });

  const excelService = await ensureListing({
    ownerId: charlie.id,
    title: "Excel Cleanup and Reporting Help",
    description: "I can clean spreadsheets, build formulas, and create dashboards for small business reporting needs.",
    category: "Business",
    type: "SERVICE",
    price: "1500.00",
    deposit: "0.00",
    condition: "Ready",
    status: "ACTIVE",
    stationCodes: ["TPE", "SSH"],
  });

  const startA = addDays(new Date(), 2);
  const endA = addDays(new Date(), 4);
  const startB = addDays(new Date(), 8);

  await prisma.booking.upsert({
    where: { id: 1 },
    update: {
      listingId: camera.id,
      ownerId: alice.id,
      renterId: bob.id,
      meetingStationId: stationByCode.TPE.id,
      startAt: startA,
      endAt: endA,
      status: "CONFIRMED",
      totalPrice: "1600.00",
      deposit: "10000.00",
      notes: "Pickup at Taipei Main Station.",
    },
    create: {
      listingId: camera.id,
      ownerId: alice.id,
      renterId: bob.id,
      meetingStationId: stationByCode.TPE.id,
      startAt: startA,
      endAt: endA,
      status: "CONFIRMED",
      totalPrice: "1600.00",
      deposit: "10000.00",
      notes: "Pickup at Taipei Main Station.",
    },
  });

  await prisma.booking.upsert({
    where: { id: 2 },
    update: {
      listingId: excelService.id,
      ownerId: charlie.id,
      renterId: bob.id,
      meetingStationId: stationByCode.SSH.id,
      startAt: startB,
      endAt: addDays(startB, 1),
      status: "PENDING",
      totalPrice: "1500.00",
      deposit: "0.00",
      notes: "Need spreadsheet cleanup for a sales report.",
    },
    create: {
      listingId: excelService.id,
      ownerId: charlie.id,
      renterId: bob.id,
      meetingStationId: stationByCode.SSH.id,
      startAt: startB,
      endAt: addDays(startB, 1),
      status: "PENDING",
      totalPrice: "1500.00",
      deposit: "0.00",
      notes: "Need spreadsheet cleanup for a sales report.",
    },
  });

  console.log("Seeded demo users, MRT stations, listings, and sample bookings.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});