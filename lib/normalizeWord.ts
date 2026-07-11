export function normalizeWord(raw: string): string {

  return raw
    .toLowerCase()
    .replace(/[^\w']/g, "")
    .trim();

}