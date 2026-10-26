/** Folds Arabic spelling variants and diacritics so "اسكان" finds "إسكان". */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "") // tashkeel, tatweel
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

/** Every word of the query appears in the text. */
export function matches(text: string, query: string): boolean {
  const t = normalize(text);
  return normalize(query)
    .split(" ")
    .every((w) => t.includes(w));
}
