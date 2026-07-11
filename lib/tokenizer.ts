import { normalizeWord } from "./normalizeWord";

export interface LessonToken {
  index: number;
  raw: string;
  normalized: string;
  isWord: boolean;
}

export function tokenizeLesson(text: string): LessonToken[] {
  const tokens = text.split(/(\s+|[.,!?;:"()])/g);

  let index = 0;

  return tokens
    .filter(t => t.length > 0)
    .map(token => {

      const normalized = normalizeWord(token);

      const isWord = normalized.length > 1;

      return {
        index: index++,
        raw: token,
        normalized,
        isWord,
      };

    });

}