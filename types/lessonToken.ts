import type { WordStatus } from "./word";

export interface LessonToken {

  index: number;

  raw: string;

  normalized: string;

  isWord: boolean;

  wordId?: number;

  status?: WordStatus;

  translation?: string;

  bookmarked?: boolean;

  timestampStart?: number;

  timestampEnd?: number;

}