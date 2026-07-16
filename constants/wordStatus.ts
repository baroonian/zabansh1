import { WORD_STATUS } from "@/types/words";

export const WordStatusColor = {
  [WORD_STATUS.NEW]: "#3B82F6",
  [WORD_STATUS.LEARNING]: "#F59E0B",
  [WORD_STATUS.KNOWN]: "#22C55E",
  [WORD_STATUS.MASTERED]: "#8B5CF6",
} as const;

export const WordStatusLabel = {
  [WORD_STATUS.NEW]: "جدید",
  [WORD_STATUS.LEARNING]: "در حال یادگیری",
  [WORD_STATUS.KNOWN]: "بلد هستم",
  [WORD_STATUS.MASTERED]: "تسلط کامل",
} as const;