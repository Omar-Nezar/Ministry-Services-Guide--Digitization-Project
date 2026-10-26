import type { PrismaClient } from "@prisma/client";

/** The fixed parts of a service's documentation, in the order they appear. */
export const sectionLabels = [
  { key: "description", name: "وصف الخدمة" },
  { key: "requirements", name: "الاشتراطات والضوابط" },
  { key: "documents", name: "المستندات والوثائق المطلوبة" },
  { key: "channel", name: "منفذ تقديم الخدمة" },
  { key: "department", name: "القسم المسؤول عن الخدمة" },
  { key: "workflow", name: "مخطط سير عمل الخدمة" },
  { key: "duration", name: "معدل الوقت المستغرق لإنجاز الخدمة" },
  { key: "fees", name: "رسوم الخدمة وآلية الدفع" },
];

/** Adds the missing labels only: names and order changed in the editor are kept. */
export async function seedSectionLabels(prisma: PrismaClient): Promise<void> {
  let created = 0;
  for (const [order, l] of sectionLabels.entries()) {
    const existing = await prisma.sectionLabel.findUnique({ where: { key: l.key }, select: { id: true } });
    if (existing) continue;
    await prisma.sectionLabel.create({ data: { ...l, order } });
    created++;
  }
  console.log(`Section labels: ${created} new.`);
}
