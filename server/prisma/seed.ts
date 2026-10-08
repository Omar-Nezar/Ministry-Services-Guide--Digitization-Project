import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const roles = ["admin", "staff"];
const serviceDivisions = [
  "Real Estate Registry",
  "Lands",
  "Social Housing and Projects",
  "Urban Planning",
  "Real Estate Development",
  "Real Estate Brokerage",
  "Client Services",
];

async function main() {
  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const name of serviceDivisions) {
    await prisma.serviceDivision.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error("Failed to seed roles and service divisions.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
