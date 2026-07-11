/**
 * Word Learning Status
 *
 * Flow:
 *
 * NEW
 *   ↓
 * LEARNING
 *   ↓
 * KNOWN
 *   ↓
 * MASTERED
 */

export const WORD_STATUS = {
  NEW: 'new',
  LEARNING: 'learning',
  KNOWN: 'known',
  MASTERED: 'mastered',
} as const;

export type WordStatus =
  (typeof WORD_STATUS)[keyof typeof WORD_STATUS];

export const WORD_STATUS_ORDER: Record<WordStatus, number> = {
  [WORD_STATUS.NEW]: 0,
  [WORD_STATUS.LEARNING]: 1,
  [WORD_STATUS.KNOWN]: 2,
  [WORD_STATUS.MASTERED]: 3,
};

export const WORD_STATUS_LABEL: Record<WordStatus, string> = {
  [WORD_STATUS.NEW]: 'جدید',
  [WORD_STATUS.LEARNING]: 'در حال یادگیری',
  [WORD_STATUS.KNOWN]: 'بلد هستم',
  [WORD_STATUS.MASTERED]: 'کاملاً مسلط',
};

export const WORD_STATUS_COLOR: Record<WordStatus, string> = {
  [WORD_STATUS.NEW]: 'text-blue-500',
  [WORD_STATUS.LEARNING]: 'text-orange-500',
  [WORD_STATUS.KNOWN]: 'text-green-500',
  [WORD_STATUS.MASTERED]: 'text-purple-500',
};

export function isLearningStatus(status: WordStatus): boolean {
  return status === WORD_STATUS.LEARNING;
}

export function isKnownStatus(status: WordStatus): boolean {
  return (
    status === WORD_STATUS.KNOWN ||
    status === WORD_STATUS.MASTERED
  );
}

export function isMasteredStatus(status: WordStatus): boolean {
  return status === WORD_STATUS.MASTERED;
}

export function canPromote(status: WordStatus): boolean {
  return status !== WORD_STATUS.MASTERED;
}

export function nextStatus(status: WordStatus): WordStatus {
  switch (status) {
    case WORD_STATUS.NEW:
      return WORD_STATUS.LEARNING;

    case WORD_STATUS.LEARNING:
      return WORD_STATUS.KNOWN;

    case WORD_STATUS.KNOWN:
      return WORD_STATUS.MASTERED;

    default:
      return WORD_STATUS.MASTERED;
  }
}