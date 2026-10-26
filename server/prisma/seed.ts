import "dotenv/config";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/utils/password.js";
import { seedSectionLabels } from "./seed/section-labels.js";

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

interface SeedFlowchart {
  title: string | null;
  order: number;
  sourceFile: string | null;
  json: string;
}

interface SeedImage {
  /** File name in prisma/seed/images */
  file: string;
  fit: string;
  caption: string | null;
  order: number;
}

interface SeedService {
  name: string;
  sourceFile: string | null;
  order: number;
  sections: SeedSection[];
  flowcharts?: SeedFlowchart[];
  images?: SeedImage[];
}

interface SeedLabel {
  key: string;
  name: string;
  order: number;
  colors: { division: string; color: string }[];
}

interface SeedDivision {
  name: string;
  nameAr: string | null;
  order: number;
  color?: string | null;
  services: SeedService[];
}

// prisma db seed runs from the project folder
const DATA_FILE = path.join(process.cwd(), "prisma", "seed", "services.json");
const IMAGE_SEED_DIR = path.join(process.cwd(), "prisma", "seed", "images");
const UPLOAD_DIR = path.join(process.cwd(), "uploads");

async function seedServices(file = DATA_FILE): Promise<void> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch {
    console.log(`No ${path.relative(process.cwd(), file)}, services skipped.`);
    return;
  }
  const { divisions, sectionLabels } = JSON.parse(text) as { divisions: SeedDivision[]; sectionLabels?: SeedLabel[] };
  await mkdir(UPLOAD_DIR, { recursive: true });
  let created = 0;
  let updated = 0;

  for (const d of divisions) {
    const division = await prisma.serviceDivision.upsert({
      where: { name: d.name },
      update: { nameAr: d.nameAr, order: d.order, color: d.color ?? null },
      create: { name: d.name, nameAr: d.nameAr, order: d.order, color: d.color ?? null },
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

        await tx.flowchart.deleteMany({ where: { serviceId: service.id } });
        if (s.flowcharts?.length) {
          await tx.flowchart.createMany({
            data: s.flowcharts.map((f) => ({ serviceId: service.id, title: f.title, order: f.order, sourceFile: f.sourceFile, json: f.json })),
          });
        }

        await tx.serviceImage.deleteMany({ where: { serviceId: service.id } });
        for (const i of s.images ?? []) {
          try {
            await copyFile(path.join(IMAGE_SEED_DIR, i.file), path.join(UPLOAD_DIR, i.file));
          } catch {
            console.log(`  Picture file ${i.file} is missing from prisma/seed/images, skipped.`);
            continue;
          }
          await tx.serviceImage.create({
            data: { serviceId: service.id, imagePath: `uploads/${i.file}`, imageFit: i.fit, caption: i.caption, order: i.order },
          });
        }
      });
    }
    console.log(`  ${d.nameAr ?? d.name}: ${d.services.length} service(s)`);
  }
  console.log(`Services: ${created} new, ${updated} updated.`);

  if (sectionLabels) await seedLabelsWithColors(sectionLabels);
}

/** The labels' names, order and per-category colours as exported from the editor. */
async function seedLabelsWithColors(labels: SeedLabel[]): Promise<void> {
  for (const l of labels) {
    const label = await prisma.sectionLabel.upsert({
      where: { key: l.key },
      update: { name: l.name, order: l.order },
      create: { key: l.key, name: l.name, order: l.order },
    });
    for (const c of l.colors) {
      const division = await prisma.serviceDivision.findUnique({ where: { name: c.division }, select: { id: true } });
      if (!division) continue;
      const where = { serviceDivisionId_labelId: { serviceDivisionId: division.id, labelId: label.id } };
      await prisma.divisionLabelColor.upsert({
        where,
        update: { color: c.color },
        create: { serviceDivisionId: division.id, labelId: label.id, color: c.color },
      });
    }
  }
  console.log(`Section labels: ${labels.length} loaded.`);
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
  await seedSectionLabels(prisma); // adds the default labels when services.json has none

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
