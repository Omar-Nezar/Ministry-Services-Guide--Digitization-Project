import "dotenv/config";
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

// Writes the pages the admin added to the exported PDF (the PDF pages tab) to prisma/seed/ so they can be
// committed and loaded again by db:seed. Kept apart from export-seed so it never rewrites services.json.
const prisma = new PrismaClient();
const seedDir = path.join(process.cwd(), "prisma", "seed");
const imageDir = path.join(seedDir, "images");

async function main() {
  await mkdir(imageDir, { recursive: true });

  const pages = await prisma.pdfPage.findMany({
    orderBy: [{ order: "asc" }, { id: "asc" }],
    include: { serviceDivision: { select: { name: true } } },
  });

  let copied = 0;
  let missing = 0;
  const data = [];
  for (const p of pages) {
    const file = path.basename(p.imagePath);
    try {
      await copyFile(path.join(process.cwd(), "uploads", file), path.join(imageDir, file));
      copied++;
    } catch {
      missing++;
      console.warn(`  Missing picture file: ${file}`);
      continue;
    }
    data.push({
      slot: p.slot,
      division: p.serviceDivision?.name ?? null,
      size: p.size,
      orientation: p.orientation,
      fit: p.imageFit,
      rotation: p.rotation,
      order: p.order,
      file,
    });
  }

  await writeFile(path.join(seedDir, "pdf-pages.json"), JSON.stringify({ pages: data }, null, 2) + "\n", "utf8");
  console.log(`Exported ${data.length} PDF pages (${copied} files copied, ${missing} missing).`);
}

main()
  .catch((error: unknown) => {
    console.error("Failed to export.", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
