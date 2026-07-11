import { normalizeWord } from "./normalizeWord";
import type { LessonToken } from "@/types/lessonToken";

const WORD_REGEX =
  /[A-Za-z]+(?:['’-][A-Za-z]+)*|[0-9]+|[^\s]/g;

export function tokenizeLesson(text: string): LessonToken[] {

  const matches = [...text.matchAll(WORD_REGEX)];

  return matches.map((m, index) => {

    const raw = m[0];

    const normalized = normalizeWord(raw);

    return {

      index,

      raw,

      normalized,

      isWord: normalized.length > 1,

      wordId: null,

      translation: null,

      bookmarked: false,

      timestamp: {

        start: null,

        end: null

      }

    };

  });

}