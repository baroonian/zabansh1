export const WORD_STATUS = {
  NEW: "new",
  LEARNING: "learning",
  KNOWN: "known",
  MASTERED: "mastered",
} as const;

export type WordStatus =
  (typeof WORD_STATUS)[keyof typeof WORD_STATUS];

export interface UserWordStatus {
  user_id: string;
  word_id: number;
  lesson_id: string;

  status: WordStatus;

  first_seen_at?: string;
  last_seen_at?: string;

  known_at?: string;

  review_count: number;
  correct_count: number;
  incorrect_count: number;

  confidence: number;

  created_at?: string;
  updated_at?: string;
}