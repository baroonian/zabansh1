import { normalizeWord } from "./normalizeWord";

export function extractWords(text: string): string[] {

  const words = text
    .split(/\s+/)
    .map(normalizeWord)
    .filter(Boolean);

  return [...new Set(words)];

}