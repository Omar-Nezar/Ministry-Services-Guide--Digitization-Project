import { prisma } from "@db";

export const byOrder = [{ order: "asc" as const }, { id: "asc" as const }];

/** Plain text from html, for the short previews on the cards. */
export function excerpt(html: string | undefined, max = 160): string {
  if (!html) return "";
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#160;|&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? text.slice(0, max).trimEnd() + "…" : text;
}

export interface GuideLabel {
  key: string;
  name: string;
  /** The category's colour for this label, or null (the site's default) */
  color: string | null;
  html: string;
  /** A section whose key is not in the label library (kept, shown after the others) */
  extra: boolean;
}

/**
 * The documentation of a service as the label rows to show: every label of the library in its order
 * (empty ones included), then any other section the service has. Colours come from the category.
 */
export async function serviceLabels(serviceId: number, divisionId: number, divisionColor: string | null): Promise<GuideLabel[]> {
  const [library, sections, overrides] = await Promise.all([
    prisma.sectionLabel.findMany({ orderBy: byOrder }),
    prisma.serviceSection.findMany({ where: { serviceId }, orderBy: byOrder }),
    prisma.divisionLabelColor.findMany({ where: { serviceDivisionId: divisionId } }),
  ]);
  const colorOf = new Map(overrides.map((o) => [o.labelId, o.color]));
  const byKey = new Map(sections.map((s) => [s.key, s]));

  const rows: GuideLabel[] = library.map((l) => ({
    key: l.key,
    name: l.name,
    color: colorOf.get(l.id) ?? divisionColor,
    html: byKey.get(l.key)?.html ?? "",
    extra: false,
  }));
  const known = new Set(library.map((l) => l.key));
  for (const s of sections) {
    if (known.has(s.key) || !s.html.trim()) continue;
    rows.push({ key: s.key, name: s.label ?? s.key, color: divisionColor, html: s.html, extra: true });
  }
  return rows;
}
