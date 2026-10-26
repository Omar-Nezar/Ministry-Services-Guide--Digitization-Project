import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { seedSectionLabels } from "./seed/section-labels.js";

// Only the label library: leaves the services and users alone (db:seed also reloads services.json).
const prisma = new PrismaClient();

seedSectionLabels(prisma)
  .catch((error: unknown) => {
    console.error("Failed to seed labels.", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
