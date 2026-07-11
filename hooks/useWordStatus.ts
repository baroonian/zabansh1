'use client'
import { useState, useCallback } from 'react'
import { WordRepository } from "@/lib/repositories/WordRepository";
import { WORD_STATUS, type WordStatus } from '@/types/word'
import { normalizeWord } from '@/lib/normalizeWord'

export type WordStatusMap = Record<string, WordStatus>;

export function useWordStatus(
  userId: string,
  lessonId: string,
  initial: WordStatusMap = {}
) {
  const [status, setStatus] = useState<WordStatusMap>(initial)

  const toggle = useCallback(
    async (word: string) => {
      const normalized = normalizeWord(word);
      if (!normalized) return;

      const cur = status[normalized];
      const next = cur === WORD_STATUS.LEARNING ? null : WORD_STATUS.LEARNING;

      setStatus(prev => {
        const n = { ...prev };
        if (!next) delete n[normalized];
        else n[normalized] = WORD_STATUS.LEARNING;
        return n;
      });

      const wordId = await WordRepository.getOrCreateWordId(normalized);

      if (next === WORD_STATUS.LEARNING) {
        await WordRepository.markLearning(userId, wordId, lessonId);
      } else {
        await WordRepository.clearStatus(userId, wordId);
      }
    },
    [status, userId, lessonId]
  );

  const markKnown = useCallback(
    async (word: string) => {
      const normalized = normalizeWord(word);
      if (!normalized) return;

      setStatus(prev => ({ ...prev, [normalized]: WORD_STATUS.KNOWN }));

      const wordId = await WordRepository.getOrCreateWordId(normalized);
      await WordRepository.markKnown(userId, wordId, lessonId);
    },
    [userId, lessonId]
  );

  const unknownWords = Object.entries(status)
    .filter(([, s]) => s === WORD_STATUS.LEARNING)
    .map(([w]) => w)

  return { status, toggle, markKnown, unknownWords }
}
