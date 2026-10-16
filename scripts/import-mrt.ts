import "dotenv/config";
import { prisma } from "../lib/prisma";
import { importMrt } from "../lib/mrt/import";
importMrt().finally(() => prisma.$disconnect());
