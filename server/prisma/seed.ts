import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/utils/password.js";

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

// ---------------------------------------------------------------------------
// TEST USER SEEDING — isolated, easily removable (development/testing only)
// Set SEED_TEST_USERS = false or delete this block to disable.
// ---------------------------------------------------------------------------
const SEED_TEST_USERS = true;

interface TestUser {
  name: string;
  email: string;
  password: string;
  division: string;
}

const testUsers: TestUser[] = [
  {
    name: "Ahmed Al-Mansouri",
    email: "ahmed.mansouri@moh.gov",
    password: "StaffPass123!",
    division: "Lands",
  },
  {
    name: "Fatima Al-Rashid",
    email: "fatima.rashid@moh.gov",
    password: "StaffPass123!",
    division: "Real Estate Registry",
  },
  {
    name: "Omar Al-Nuaimi",
    email: "omar.nuaimi@moh.gov",
    password: "StaffPass123!",
    division: "Urban Planning",
  },
  {
    name: "Sara Al-Falasi",
    email: "sara.falasi@moh.gov",
    password: "StaffPass123!",
    division: "Client Services",
  },
];

async function seedTestUsers(): Promise<void> {
  if (!SEED_TEST_USERS) return;

  const staffRole = await prisma.role.findUnique({ where: { name: "staff" } });
  if (!staffRole) {
    console.log("  Skipping test users: 'staff' role not found.");
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const u of testUsers) {
    const division = await prisma.serviceDivision.findUnique({
      where: { name: u.division },
    });
    if (!division) {
      console.log(`  Skipping ${u.email}: division "${u.division}" not found.`);
      skipped++;
      continue;
    }

    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (existing) {
      console.log(`  Skipping ${u.email}: already exists.`);
      skipped++;
      continue;
    }

    const passwordHash = await hashPassword(u.password);

    await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        passwordHash,
        roles: { create: { roleId: staffRole.id } },
        serviceDivisions: { create: { serviceDivisionId: division.id } },
      },
    });
    created++;
  }

  console.log(`Test users: ${created} created, ${skipped} skipped.`);
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

  await seedTestUsers();
}

main()
  .catch((error: unknown) => {
    console.error("Failed to seed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
