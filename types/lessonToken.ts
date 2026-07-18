import type { WordStatus } from "./word";

export interface LessonToken {
  /** Position inside lesson */
  readonly index: number;

  /** Original text */
  readonly raw: string;

  /** Normalized word */
  readonly normalized: string;

  /** Word or punctuation */
  readonly isWord: boolean;

  /** FK -> words.id */
  wordId: number | null;

  /** Translation (loaded later) */
  translation: string | null;

  /** Bookmark state */
  bookmarked: boolean;

  /** Audio timestamp */
  timestamp: {
    start: number | null;
    end: number | null;
  };
}

/**
 * Dynamic state
 * key = wordId
 */
export type WordStateMap = Record<number, WordStatus>;