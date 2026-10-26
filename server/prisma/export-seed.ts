import "dotenv/config";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

// Writes the services, diagrams, pictures and labels now in the database to prisma/seed/ so they
// can be committed and loaded again by db:seed.
const prisma = new PrismaClient();
const seedDir = path.join(process.cwd(), "prisma", "seed");
const imageDir = path.join(seedDir, "images");

async function main() {
  await mkdir(imageDir, { recursive: true });

  const divisions = await prisma.serviceDivision.findMany({
    orderBy: [{ order: "asc" }, { id: "asc" }],
    include: {
      services: {
        orderBy: [{ order: "asc" }, { id: "asc" }],
        include: {
          sections: { orderBy: { order: "asc" } },
          flowcharts: { orderBy: [{ order: "asc" }, { id: "asc" }] },
          images: { orderBy: [{ order: "asc" }, { id: "asc" }] },
        },
      },
    },
  });
  const labels = await prisma.sectionLabel.findMany({ orderBy: { order: "asc" }, include: { colors: true } });
  const divisionName = new Map(divisions.map((d) => [d.id, d.name]));

  let missing = 0;
  let copied = 0;
  const data = {
    exportedAt: new Date().toISOString(),
    sectionLabels: labels.map((l) => ({
      key: l.key,
      name: l.name,
      order: l.order,
      colors: l.colors.map((c) => ({ division: divisionName.get(c.serviceDivisionId) ?? "", color: c.color })),
    })),
    divisions: await Promise.all(
      divisions.map(async (d) => ({
        name: d.name,
        nameAr: d.nameAr,
        order: d.order,
        color: d.color,
        services: await Promise.all(
          d.services.map(async (s) => ({
            name: s.name,
            sourceFile: s.sourceFile,
            order: s.order,
            sections: s.sections.map((x) => ({ key: x.key, label: x.label, order: x.order, html: x.html })),
            flowcharts: s.flowcharts.map((f) => ({ title: f.title, order: f.order, sourceFile: f.sourceFile, json: f.json })),
            images: await Promise.all(
              s.images.map(async (i) => {
                const file = path.basename(i.imagePath);
                try {
                  await copyFile(path.join(process.cwd(), "uploads", file), path.join(imageDir, file));
                  copied++;
                } catch {
                  missing++;
                  console.warn(`  Missing picture file: ${file} (${s.name})`);
                }
                return { file, fit: i.imageFit, caption: i.caption, order: i.order };
              }),
            ),
          })),
        ),
      })),
    ),
  };

  await writeFile(path.join(seedDir, "services.json"), JSON.stringify(data, null, 2) + "\n", "utf8");
  const all = data.divisions.flatMap((d) => d.services);
  console.log(
    `Exported ${all.length} services, ${all.reduce((n, s) => n + s.flowcharts.length, 0)} flowcharts, ` +
      `${all.reduce((n, s) => n + s.images.length, 0)} pictures (${copied} files copied, ${missing} missing), ${labels.length} labels.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("Failed to export.", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
