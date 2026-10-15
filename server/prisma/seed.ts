import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
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
  "IT",
];

interface SeedSection {
  key: string;
  label: string | null;
  order: number;
  html: string;
}

interface SeedService {
  name: string;
  sourceFile: string | null;
  order: number;
  sections: SeedSection[];
}

interface SeedDivision {
  name: string;
  nameAr: string | null;
  order: number;
  services: SeedService[];
}

// prisma db seed runs from the project folder
const DATA_FILE = path.join(process.cwd(), "prisma", "seed", "services.json");

async function seedServices(file = DATA_FILE): Promise<void> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    console.log(`No ${path.relative(process.cwd(), file)}, services skipped.`);
    return;
  }
  const { divisions } = JSON.parse(text) as { divisions: SeedDivision[] };
  let created = 0;
  let updated = 0;

  for (const d of divisions) {
    const division = await prisma.serviceDivision.upsert({
      where: { name: d.name },
      update: { nameAr: d.nameAr, order: d.order },
      create: { name: d.name, nameAr: d.nameAr, order: d.order },
    });

    for (const s of d.services) {
      await prisma.$transaction(async (tx) => {
        const where = { serviceDivisionId_name: { serviceDivisionId: division.id, name: s.name } };
        const existing = await tx.service.findUnique({ where, select: { id: true } });
        const fields = { sourceFile: s.sourceFile, order: s.order };
        const service = existing
          ? await tx.service.update({ where, data: fields })
          : await tx.service.create({ data: { ...fields, name: s.name, serviceDivisionId: division.id } });
        if (existing) updated++;
        else created++;

        await tx.serviceSection.deleteMany({ where: { serviceId: service.id } });
        if (s.sections.length) {
          await tx.serviceSection.createMany({
            data: s.sections.map((x) => ({ serviceId: service.id, key: x.key, label: x.label, order: x.order, html: x.html })),
          });
        }
      });
    }
    console.log(`  ${d.nameAr ?? d.name}: ${d.services.length} service(s)`);
  }
  console.log(`Services: ${created} new, ${updated} updated.`);
}

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

  await seedServices();
}

main()
  .catch((error: unknown) => {
    console.error("Failed to seed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
